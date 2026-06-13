const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Vendor = require('../models/Vendor');
const Promotion = require('../models/Promotion');
const PlatformSetting = require('../models/PlatformSetting');
const ResponseHelper = require('../utils/responseHelper');
const dispatchService = require('../services/dispatchService');
const notificationService = require('../services/notificationService');
const { sendCSV, iso, num } = require('../utils/csv');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];
const EXPORT_MAX = 100000;

// Delivery pricing now lives in PlatformSetting (company-controlled, editable
// from the admin board) instead of a hardcoded env constant.

// Branch ids belonging to every restaurant owned by the given user.
async function ownedBranchIds(userId) {
  const vendors = await Vendor.find({ owner_user_id: userId }).select('id').lean();
  if (vendors.length === 0) return [];
  const vendorIds = vendors.map((v) => v.id);
  const branches = await Branch.find({ vendor_id: { $in: vendorIds } }).select('id').lean();
  return branches.map((b) => b.id);
}

function lineTotal(it) {
  const optionsTotal = Array.isArray(it.options)
    ? it.options.reduce((s, o) => s + (Number(o.price) || 0), 0)
    : 0;
  return (Number(it.unit_price) + optionsTotal) * Number(it.qty);
}

// Discount for an already-claimed promo. Computed directly (not via the model's
// calculateDiscount, which re-runs canUse) because the atomic claim has just
// incremented used_count — which would make isValid() report false for the very
// last allowed redemption.
function promoDiscount(promo, amount) {
  if (promo.type === 'percentage') {
    let d = amount * (Number(promo.value) / 100);
    if (promo.max_discount) d = Math.min(d, Number(promo.max_discount));
    return Math.round(d * 100) / 100;
  }
  if (promo.type === 'fixed') {
    // Never discount more than the cart is worth, or the order total goes
    // negative (clamped to 0) and the platform eats the delivery fee.
    return Math.min(Math.round(Number(promo.value) * 100) / 100, amount);
  }
  return 0; // free_delivery carries no line discount
}

// --- Jawlaha Box helpers ---------------------------------------------------
// Reject radius: a Box pickup whose pin is within this many metres of a listed
// branch is treated as that restaurant (can't bypass the restaurant flow).
const BOX_NEAR_BRANCH_METERS = 150;

// Normalize a place/restaurant name for fuzzy comparison: lowercase, strip
// Arabic diacritics/tatweel, drop spaces and punctuation. Keeps Arabic + Latin
// letters and digits so "مطعم جولة" and "مطعم  جولة!" compare equal.
function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')        // Arabic harakat + tatweel
    .replace(/[^\p{L}\p{N}]/gu, '');               // keep letters/numbers only
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// THE critical rule: a Box pickup must NOT be one of Jawlaha's listed
// restaurants. Returns the offending stop+restaurant name on a match, else null.
// Matches by name (fuzzy, either-direction containment, min 3 chars) OR by a pin
// within BOX_NEAR_BRANCH_METERS of an active branch.
async function findListedRestaurantConflict(stops) {
  const [vendors, branches] = await Promise.all([
    Vendor.find({ is_active: true }).select('name').lean(),
    Branch.find({ is_active: true }).select('name lat lng').lean()
  ]);
  const names = [
    ...vendors.map((v) => ({ raw: v.name, norm: normalizeName(v.name) })),
    ...branches.map((b) => ({ raw: b.name, norm: normalizeName(b.name) }))
  ].filter((n) => n.norm.length >= 3);

  for (const stop of stops || []) {
    const sn = normalizeName(stop.place_name);
    if (sn.length >= 3) {
      const hit = names.find((n) => sn.includes(n.norm) || n.norm.includes(sn));
      if (hit) return { stop: stop.place_name, restaurant: hit.raw };
    }
    const lat = Number(stop.lat);
    const lng = Number(stop.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const near = branches.find((b) =>
        Number.isFinite(b.lat) && Number.isFinite(b.lng) &&
        haversineMeters(lat, lng, b.lat, b.lng) <= BOX_NEAR_BRANCH_METERS);
      if (near) return { stop: stop.place_name, restaurant: near.name };
    }
  }
  return null;
}

class OrderController {
  // POST /orders  — checkout from the user's cart (Cash on Delivery)
  async createOrder(req, res) {
    try {
      const userId = req.user.user_id;
      const {
        delivery_address = null,
        delivery_lat = null,
        delivery_lng = null,
        delivery_note = null,
        leave_at_door = false,
        dont_ring_bell = false,
        promo_code = null
      } = req.body;

      // Optional precise map pin (from the customer app's location picker), so
      // the driver can navigate to the exact spot. Coerce + drop NaN so a bad
      // value never persists.
      const num = (v) => {
        const n = Number(v);
        return v != null && Number.isFinite(n) ? n : null;
      };
      const deliveryLat = num(delivery_lat);
      const deliveryLng = num(delivery_lng);

      // A COD delivery needs somewhere to go: require either a written address
      // or a precise map pin, otherwise the driver has nothing to navigate to.
      const hasAddress = typeof delivery_address === 'string' && delivery_address.trim().length > 0;
      const hasPin = deliveryLat != null && deliveryLng != null;
      if (!hasAddress && !hasPin) {
        return res.status(400).json(ResponseHelper.error('A delivery address or map location is required', null, 0));
      }

      // Read the cart up front for validation. The cart is only *claimed*
      // (emptied) atomically at the very end, so a failed validation never
      // wipes it.
      const cart = await Cart.findOne({ user_id: userId });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json(ResponseHelper.error('Cart is empty', null, 0));
      }

      // Company-controlled delivery pricing from the platform settings (set by
      // admins, never merchants). A per-city override or the free-delivery
      // threshold / a free_delivery promo below can still adjust it.
      const settings = await PlatformSetting.getSingleton();

      const branchId = cart.items[0].branch_id || null;
      let deliveryFee = Number(settings.delivery_fee) || 0;
      let vendorName = null;
      let branch = null;
      if (branchId) {
        branch = await Branch.findOne({ id: branchId });
        // Guard the checkout against a restaurant that can't currently take the
        // order. Without this a customer could order from a branch that is
        // blocked, paused (busy), or whose restaurant isn't approved/active.
        if (!branch || branch.is_active === false) {
          return res.status(409).json(ResponseHelper.error('This restaurant is currently unavailable', null, 0));
        }
        // Keeta-style "busy" toggle the restaurant controls itself. Legacy
        // branches without the field (undefined) are treated as accepting.
        if (branch.is_accepting_orders === false) {
          return res.status(409).json(ResponseHelper.error('This restaurant is busy right now and not accepting new orders', null, 0));
        }
        // Off-schedule: the restaurant is outside its working hours. Only
        // enforced when a schedule exists (branches without work_time are
        // always treated as open).
        if (branch.work_time && !branch.isOpen()) {
          return res.status(409).json(ResponseHelper.error('This restaurant is closed right now', null, 0));
        }
        // Apply the city-specific delivery fee (falls back to the global fee).
        deliveryFee = settings.resolveDeliveryFee(branch.city);
        // Snapshot the restaurant name onto the order so the customer's order
        // list/details and the admin board show it without a join.
        const vendor = await Vendor.findOne({ id: branch.vendor_id }).select('name is_active approval_status').lean();
        if (vendor) {
          if (vendor.is_active === false || (vendor.approval_status && vendor.approval_status !== 'approved')) {
            return res.status(409).json(ResponseHelper.error('This restaurant is currently unavailable', null, 0));
          }
          vendorName = vendor.name;
        }
      }

      const subtotal = cart.items.reduce((sum, it) => sum + lineTotal(it), 0);

      // Enforce the restaurant's minimum order. Without this a customer can
      // place a sub-minimum order the merchant can't profitably fulfil.
      if (branch && branch.min_order && subtotal < Number(branch.min_order)) {
        return res.status(409).json(
          ResponseHelper.error(
            `This restaurant has a minimum order of ${branch.min_order} ${settings.currency || 'SYP'}`,
            { min_order: Number(branch.min_order) },
            0
          )
        );
      }

      // Platform-wide free-delivery threshold (0 disables): orders at/above this
      // subtotal ship free regardless of city fee.
      if (settings.free_delivery_min_subtotal > 0 && subtotal >= settings.free_delivery_min_subtotal) {
        deliveryFee = 0;
      }

      // Apply a promo code when supplied and currently usable. The redemption is
      // claimed atomically so a usage_limit can't be exceeded under concurrent
      // checkouts; unknown/expired/exhausted codes are silently ignored (discount
      // stays 0) so checkout never blocks.
      let discount = 0;
      let appliedPromo = null;
      if (promo_code) {
        const now = new Date();
        const code = String(promo_code).trim().toUpperCase();
        const claimed = await Promotion.findOneAndUpdate(
          {
            code,
            is_active: true,
            start_date: { $lte: now },
            end_date: { $gte: now },
            $or: [
              { usage_limit: null },
              { $expr: { $lt: ['$used_count', '$usage_limit'] } }
            ]
          },
          { $inc: { used_count: 1 } },
          { new: true }
        );
        if (claimed) {
          // Per-customer cap: how many non-cancelled orders this user already
          // redeemed this code on. Counted after the atomic global claim, then
          // released if over the cap (mirrors the min-order release below).
          let perUserExceeded = false;
          if (claimed.per_user_limit != null) {
            const usedByUser = await Order.countDocuments({
              user_id: userId,
              promo_code: code,
              status: { $ne: 'cancelled' }
            });
            perUserExceeded = usedByUser >= Number(claimed.per_user_limit);
          }
          if (
            (claimed.min_order_amount && subtotal < claimed.min_order_amount) ||
            perUserExceeded
          ) {
            // Order is below the code's minimum, or the customer already used it
            // up — release the redemption.
            await Promotion.updateOne({ id: claimed.id }, { $inc: { used_count: -1 } });
          } else if (claimed.type === 'free_delivery') {
            deliveryFee = 0;
            appliedPromo = claimed;
          } else {
            // Clamp so a fixed/percentage discount never exceeds the subtotal.
            discount = Math.min(promoDiscount(claimed, subtotal), subtotal);
            appliedPromo = claimed;
          }
        }
      }

      // Release a claimed promo redemption — used when the checkout fails after
      // the atomic claim (double-submit, order persist error) so a limited code
      // isn't burned by a failed order.
      const releasePromo = async () => {
        if (appliedPromo) {
          await Promotion.updateOne({ id: appliedPromo.id }, { $inc: { used_count: -1 } }).catch(() => {});
        }
      };

      const total = Math.max(0, subtotal + deliveryFee - discount);

      // Idempotency / double-submit guard: atomically claim (empty) this exact
      // cart. The `updated_at` precondition means only one of two concurrent
      // checkouts wins; the loser sees no match and is rejected instead of
      // creating a duplicate order. Validation above already passed, so the
      // cart is only ever emptied on a real checkout.
      const claimedCart = await Cart.findOneAndUpdate(
        { user_id: userId, updated_at: cart.updated_at, 'items.0': { $exists: true } },
        { $set: { items: [] } },
        { new: false }
      );
      if (!claimedCart) {
        await releasePromo();
        return res.status(409).json(
          ResponseHelper.error('This order was already submitted', null, 0)
        );
      }

      let order;
      try {
        order = await Order.create({
        user_id: userId,
        branch_id: branchId,
        vendor_name: vendorName,
        items: cart.items.map((it) => ({
          product_id: it.product_id,
          variation_id: it.variation_id,
          name: it.name,
          image: it.image,
          unit_price: it.unit_price,
          qty: it.qty,
          options: it.options,
          note: it.note ?? null
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        delivery_fee: deliveryFee,
        discount: Math.round(discount * 100) / 100,
        promo_code: appliedPromo ? appliedPromo.code : null,
        total: Math.round(total * 100) / 100,
        currency: settings.currency || 'SYP',
        payment_method: 'COD',
        status: 'pending',
        delivery_address,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        delivery_note,
        leave_at_door: !!leave_at_door,
        dont_ring_bell: !!dont_ring_bell,
        status_timeline: Order.buildTimeline('pending'),
        eta_minutes: 35
        });
      } catch (e) {
        // Order persist failed after we already emptied the cart and claimed the
        // promo — restore both so the customer doesn't silently lose their cart
        // or burn a limited code.
        await Cart.updateOne({ user_id: userId }, { $set: { items: cart.items } }).catch(() => {});
        await releasePromo();
        throw e;
      }

      // Confirm the order to the customer (persist + push). Fire-and-forget —
      // a notification failure must never break checkout.
      notificationService
        .notifyOrderStatus(order, 'pending')
        .catch((e) => console.error('notify hook error:', e));

      res.status(201).json(ResponseHelper.success(order, 'Order placed successfully', 1));
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json(ResponseHelper.error('Failed to place order', error.message, 0));
    }
  }

  // GET /orders/box/config — pricing + limits the customer app needs to show a
  // live fee estimate and enforce limits client-side (the real fee is still
  // resolved server-side at create). Not sensitive.
  async getBoxConfig(req, res) {
    try {
      const s = await PlatformSetting.getSingleton();
      return res.json(ResponseHelper.success({
        base_fee: s.resolveBoxBaseFee(req.query.city || null),
        extra_item_fee: s.box_extra_item_fee,
        extra_stop_fee: s.box_extra_stop_fee,
        included_items: s.box_included_items,
        max_items: s.box_max_items,
        max_stops: s.box_max_stops,
        max_budget: s.box_max_budget,
        currency: s.currency || 'SYP'
      }, 'Box config', 1));
    } catch (error) {
      console.error('Box config error:', error);
      res.status(500).json(ResponseHelper.error('Failed to load Box config', error.message, 0));
    }
  }

  // POST /orders/box — create a Jawlaha Box errand order (COD). No restaurant /
  // merchant: the customer lists items + pickup stops, the service fee is
  // resolved server-side, and the order dispatches to drivers immediately.
  async createBoxOrder(req, res) {
    try {
      const userId = req.user.user_id;
      const {
        stops = [],
        items = [],
        budget_cap = 0,
        instructions = null,
        city = null,
        delivery_address = null,
        delivery_lat = null,
        delivery_lng = null,
        delivery_note = null,
        accept_restricted = false
      } = req.body;

      const num = (v) => { const n = Number(v); return v != null && Number.isFinite(n) ? n : null; };
      const deliveryLat = num(delivery_lat);
      const deliveryLng = num(delivery_lng);

      const settings = await PlatformSetting.getSingleton();

      // --- Validate items & stops against the admin limits ---
      const cleanItems = (Array.isArray(items) ? items : [])
        .filter((it) => it && typeof it.description === 'string' && it.description.trim());
      const cleanStops = (Array.isArray(stops) ? stops : [])
        .filter((s) => s && typeof s.place_name === 'string' && s.place_name.trim());
      if (cleanItems.length === 0) {
        return res.status(400).json(ResponseHelper.error('Add at least one item to bring', null, 0));
      }
      if (cleanItems.length > settings.box_max_items) {
        return res.status(400).json(ResponseHelper.error(`You can request at most ${settings.box_max_items} items`, { box_max_items: settings.box_max_items }, 0));
      }
      if (cleanStops.length === 0) {
        return res.status(400).json(ResponseHelper.error('Add at least one pickup place', null, 0));
      }
      if (cleanStops.length > settings.box_max_stops) {
        return res.status(400).json(ResponseHelper.error(`You can request at most ${settings.box_max_stops} pickup places`, { box_max_stops: settings.box_max_stops }, 0));
      }

      // --- Destination required ---
      const hasAddress = typeof delivery_address === 'string' && delivery_address.trim().length > 0;
      if (!hasAddress && (deliveryLat == null || deliveryLng == null)) {
        return res.status(400).json(ResponseHelper.error('A delivery address or map location is required', null, 0));
      }

      // --- Budget cap ---
      const budget = num(budget_cap);
      if (budget == null || budget <= 0) {
        return res.status(400).json(ResponseHelper.error('Set a budget for the purchases', null, 0));
      }
      if (settings.box_max_budget && budget > settings.box_max_budget) {
        return res.status(400).json(ResponseHelper.error(`Budget cannot exceed ${settings.box_max_budget} ${settings.currency || 'SYP'}`, { box_max_budget: settings.box_max_budget }, 0));
      }

      // --- THE critical rule: no pickup may be a listed Jawlaha restaurant ---
      const conflict = await findListedRestaurantConflict(cleanStops);
      if (conflict) {
        return res.status(409).json(ResponseHelper.error(
          `"${conflict.restaurant}" is a Jawlaha restaurant — order it directly from the app, not via Box`,
          { listed_restaurant: conflict.restaurant, stop: conflict.stop },
          0
        ));
      }

      // --- Service fee (server-side, admin-priced) ---
      const serviceFee = settings.computeBoxServiceFee({ city, itemCount: cleanItems.length, stopCount: cleanStops.length });

      const order = await Order.create({
        user_id: userId,
        order_type: 'box',
        branch_id: null,
        vendor_name: 'Jawlaha Box',
        items: [],
        box: {
          stops: cleanStops.map((s) => ({
            place_name: String(s.place_name).trim(),
            address: s.address ? String(s.address).trim() : null,
            lat: num(s.lat),
            lng: num(s.lng),
            note: s.note ? String(s.note).trim() : null
          })),
          items: cleanItems.map((it) => ({
            description: String(it.description).trim(),
            qty: Math.max(1, Math.round(Number(it.qty) || 1)),
            category: it.category ? String(it.category).trim() : null,
            note: it.note ? String(it.note).trim() : null,
            stop_index: Number.isFinite(Number(it.stop_index)) ? Number(it.stop_index) : 0,
            status: 'pending',
            actual_price: null
          })),
          budget_cap: budget,
          service_fee: serviceFee,
          purchases_total: 0,
          instructions: instructions ? String(instructions).trim() : null
        },
        subtotal: 0,
        // The driver keeps the service fee (mirrors how restaurant drivers keep
        // the delivery fee), so it flows through the existing earnings logic.
        delivery_fee: serviceFee,
        discount: 0,
        // COD collected = purchases + fee. At create, purchases are unknown, so
        // the total starts at the fee and grows when the driver logs purchases.
        total: serviceFee,
        currency: settings.currency || 'SYP',
        payment_method: 'COD',
        // 'ready' so the existing dispatch + driver board pick it up immediately
        // (Box has no merchant 'preparing'/'ready' step).
        status: 'ready',
        delivery_address,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        delivery_note,
        status_timeline: Order.buildTimeline('ready'),
        eta_minutes: null
      });

      // Dispatch to drivers right away (fire-and-forget).
      dispatchService.dispatchOrder(order.order_id).catch((e) => console.error('box dispatch error:', e));
      notificationService.notifyOrderStatus(order, 'ready').catch((e) => console.error('notify hook error:', e));

      res.status(201).json(ResponseHelper.success(order, 'Jawlaha Box order placed', 1));
    } catch (error) {
      console.error('Create box order error:', error);
      res.status(500).json(ResponseHelper.error('Failed to place Box order', error.message, 0));
    }
  }

  // GET /orders?status=&page=&limit=  — order history + stats
  async getOrders(req, res) {
    try {
      const userId = req.user.user_id;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const status = req.query.status;

      const query = { user_id: userId };
      if (status && Order.ORDER_STATUSES.includes(status)) {
        query.status = status;
      }

      const offset = (page - 1) * limit;
      const [rows, count, totalAll] = await Promise.all([
        Order.find(query).sort({ created_at: -1 }).skip(offset).limit(limit),
        Order.countDocuments(query),
        Order.countDocuments({ user_id: userId })
      ]);

      res.json(
        ResponseHelper.success({
          orders: rows,
          stats: { total_orders: totalAll },
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit
          }
        }, 'Orders retrieved successfully', rows.length)
      );
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get orders', error.message, 0));
    }
  }

  // GET /orders/:id  — details + timeline (used by order-details and tracking)
  async getOrder(req, res) {
    try {
      const order = await Order.findOne({ order_id: req.params.id, user_id: req.user.user_id });
      if (!order) {
        return res.status(404).json(ResponseHelper.error('Order not found', null, 0));
      }
      res.json(ResponseHelper.success(order, 'Order retrieved successfully', 1));
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get order', error.message, 0));
    }
  }

  // Customers cannot cancel an order. Once a Cash-on-Delivery order is placed it
  // is final (Keeta-style) — there is intentionally no customer cancel endpoint.
  // Restaurants/admins handle genuine operational exceptions through
  // updateOrderStatus, which is the only path that may set status to 'cancelled'.

  // GET /orders/incoming  — the "Jawlah box": orders for the restaurant's
  // branches (owner) or every order (platform admin).
  async getIncomingOrders(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const status = req.query.status;
      const isAdmin = ADMIN_TYPES.includes(req.user.account_type);

      const query = {};
      if (!isAdmin) {
        const branchIds = await ownedBranchIds(req.user.user_id);
        if (branchIds.length === 0) {
          return res.json(
            ResponseHelper.success(
              { orders: [], stats: { total_orders: 0, pending: 0 }, pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: limit } },
              'No orders yet',
              0
            )
          );
        }
        query.branch_id = { $in: branchIds };
      }
      if (status && Order.ORDER_STATUSES.includes(status)) {
        query.status = status;
      }

      const offset = (page - 1) * limit;
      const baseQuery = isAdmin ? {} : { branch_id: query.branch_id };
      const [rows, count, totalAll, pendingCount] = await Promise.all([
        Order.find(query).sort({ created_at: -1 }).skip(offset).limit(limit),
        Order.countDocuments(query),
        Order.countDocuments(baseQuery),
        Order.countDocuments({ ...baseQuery, status: 'pending' })
      ]);

      // Resolve each order's customer contact (the order only stores user_id) so
      // the merchant can phone the customer about the order. Batched, one query.
      const userIds = [...new Set(rows.map((o) => o.user_id).filter(Boolean))];
      const users = userIds.length
        ? await User.find({ user_id: { $in: userIds } })
            .select('user_id full_name username country_code phone_number')
            .lean()
        : [];
      const userById = new Map(users.map((u) => [u.user_id, u]));
      const orders = rows.map((o) => {
        const u = userById.get(o.user_id);
        return {
          ...o.toJSON(),
          customer: u
            ? { name: u.full_name || u.username, phone: `${u.country_code || ''}${u.phone_number || ''}` }
            : null
        };
      });

      res.json(
        ResponseHelper.success({
          orders,
          stats: { total_orders: totalAll, pending: pendingCount },
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit
          }
        }, 'Incoming orders retrieved successfully', rows.length)
      );
    } catch (error) {
      console.error('Get incoming orders error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get incoming orders', error.message, 0));
    }
  }

  // GET /orders/incoming/export — the merchant's own orders as a CSV for their
  // accountant. Scoped to the owner's branches (admins get everything), honours
  // the same status/date filters. Money is raw numbers, dates ISO 8601.
  async exportIncomingOrders(req, res) {
    try {
      const isAdmin = ADMIN_TYPES.includes(req.user.account_type);
      const { status, date_from, date_to } = req.query;
      const query = {};
      if (!isAdmin) {
        const branchIds = await ownedBranchIds(req.user.user_id);
        if (branchIds.length === 0) {
          return sendCSV(res, 'orders.csv', [], [{ header: 'Order ID', value: (o) => o.order_id }]);
        }
        query.branch_id = { $in: branchIds };
      }
      if (status && Order.ORDER_STATUSES.includes(status)) query.status = status;
      if (date_from || date_to) {
        query.created_at = {};
        if (date_from) query.created_at.$gte = new Date(date_from);
        if (date_to) { const end = new Date(date_to); end.setHours(23, 59, 59, 999); query.created_at.$lte = end; }
      }

      const rows = await Order.find(query).sort({ created_at: -1 }).limit(EXPORT_MAX).lean();
      // Resolve customer contact for each order (same as the inbox).
      const userIds = [...new Set(rows.map((o) => o.user_id).filter(Boolean))];
      const users = userIds.length
        ? await User.find({ user_id: { $in: userIds } }).select('user_id full_name username country_code phone_number').lean()
        : [];
      const userById = new Map(users.map((u) => [u.user_id, u]));

      return sendCSV(res, `orders-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { header: 'Order ID', value: (o) => o.order_id },
        { header: 'Created At', value: (o) => iso(o.created_at) },
        { header: 'Delivered At', value: (o) => iso(o.delivered_at) },
        { header: 'Status', value: (o) => o.status },
        { header: 'Restaurant', value: (o) => o.vendor_name },
        { header: 'Customer', value: (o) => { const u = userById.get(o.user_id); return u ? (u.full_name || u.username) : ''; } },
        { header: 'Customer Phone', value: (o) => { const u = userById.get(o.user_id); return u ? `${u.country_code || ''}${u.phone_number || ''}` : ''; } },
        { header: 'Payment', value: (o) => o.payment_method },
        { header: 'Currency', value: (o) => o.currency },
        { header: 'Subtotal', value: (o) => num(o.subtotal) },
        { header: 'Delivery Fee', value: (o) => num(o.delivery_fee) },
        { header: 'Discount', value: (o) => num(o.discount) },
        { header: 'Promo Code', value: (o) => o.promo_code },
        { header: 'Total', value: (o) => num(o.total) },
        { header: 'Driver', value: (o) => o.driver && o.driver.name },
        { header: 'Delivery Address', value: (o) => o.delivery_address },
      ]);
    } catch (error) {
      console.error('Export incoming orders error:', error);
      res.status(500).json(ResponseHelper.error('Failed to export orders', error.message, 0));
    }
  }

  // PATCH /orders/:id/status  — restaurant/admin advances an order's status.
  async updateOrderStatus(req, res) {
    try {
      const { status, eta_minutes, cancel_reason, expected_status } = req.body;
      if (!status || !Order.ORDER_STATUSES.includes(status)) {
        return res.status(400).json(
          ResponseHelper.error(`status must be one of: ${Order.ORDER_STATUSES.join(', ')}`, null, 0)
        );
      }

      const order = await Order.findOne({ order_id: req.params.id });
      if (!order) {
        return res.status(404).json(ResponseHelper.error('Order not found', null, 0));
      }

      // Ownership: admins manage any order; owners only their branches' orders.
      const isAdmin = ADMIN_TYPES.includes(req.user.account_type);
      if (!isAdmin) {
        const branchIds = await ownedBranchIds(req.user.user_id);
        if (!order.branch_id || !branchIds.includes(order.branch_id)) {
          return res.status(403).json(ResponseHelper.error('You cannot manage this order', null, 0));
        }
      }

      // Optimistic concurrency: the client tells us the status it was showing.
      // If a colleague (or another tab) already advanced the order, reject so the
      // UI refreshes instead of silently clobbering their change.
      if (expected_status && order.status !== expected_status) {
        return res.status(409).json(
          ResponseHelper.error('This order was just updated by someone else. Refresh and try again.', { current_status: order.status }, 0)
        );
      }

      // Prep-time ETA the merchant promises when accepting (or adjusting). Clamped
      // to a sane 1–180 min so the customer's "ready in ~X" stays believable.
      if (eta_minutes != null) {
        const eta = Math.round(Number(eta_minutes));
        if (Number.isFinite(eta) && eta > 0) order.eta_minutes = Math.min(eta, 180);
      }
      // Reason captured when a merchant rejects/cancels an order.
      if (status === 'cancelled' && typeof cancel_reason === 'string' && cancel_reason.trim()) {
        order.cancel_reason = cancel_reason.trim().slice(0, 300);
      }

      // Was a driver holding this order at the moment it got cancelled? Capture
      // before we clear the assignment, so we can notify them.
      const cancelledDriverId =
        status === 'cancelled' && order.driver_user_id ? order.driver_user_id : null;

      order.status = status;
      // Stable payout timestamp the first time the order is delivered.
      if (status === 'delivered' && !order.delivered_at) {
        order.delivered_at = new Date();
      }
      // Cancelling releases any driver/offer so a stale assignment doesn't linger
      // (the driver is notified below).
      if (status === 'cancelled') {
        order.driver_user_id = null;
        order.driver = null;
        order.assignment_attempt = null;
      }
      // Rebuild the linear timeline so every step up to the new status is marked
      // done (preserving earlier timestamps). Previously this appended a junk
      // `Status: x` step and left the real steps' done flags stale, so the
      // customer's tracking screen never advanced past "Order placed".
      if (Order.ORDER_STATUSES.includes(status) && status !== 'cancelled') {
        order.status_timeline = Order.buildTimeline(status, order.status_timeline);
      }
      await order.save();

      // Notify the customer of the new status (persist + push). Fire-and-forget.
      notificationService
        .notifyOrderStatus(order, status)
        .catch((e) => console.error('notify hook error:', e));

      // Tell the assigned driver their order was cancelled so they stop the run.
      if (cancelledDriverId) {
        notificationService
          .notifyDriverOrderCancelled({ order_id: order.order_id, driver_user_id: cancelledDriverId })
          .catch((e) => console.error('notify hook error:', e));
      }

      // Smart dispatch: once an order is ready, route it to the best driver.
      // Fire-and-forget — a dispatch failure must never break the status update.
      if (status === 'ready') {
        dispatchService
          .dispatchOrder(order.order_id)
          .catch((e) => console.error('dispatch hook error:', e));
      }

      res.json(ResponseHelper.success(order, 'Order status updated', 1));
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json(ResponseHelper.error('Failed to update order status', error.message, 0));
    }
  }
}

module.exports = new OrderController();
