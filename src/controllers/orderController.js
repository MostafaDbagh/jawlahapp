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

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

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
    return Math.round(Number(promo.value) * 100) / 100;
  }
  return 0; // free_delivery carries no line discount
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
      if (branchId) {
        const branch = await Branch.findOne({ id: branchId });
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
          if (claimed.min_order_amount && subtotal < claimed.min_order_amount) {
            // Order is below the code's minimum — release the redemption.
            await Promotion.updateOne({ id: claimed.id }, { $inc: { used_count: -1 } });
          } else if (claimed.type === 'free_delivery') {
            deliveryFee = 0;
            appliedPromo = claimed;
          } else {
            discount = promoDiscount(claimed, subtotal);
            appliedPromo = claimed;
          }
        }
      }

      const total = Math.max(0, subtotal + deliveryFee - discount);

      const order = await Order.create({
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

      // Empty the cart after a successful checkout.
      cart.items = [];
      await cart.save();

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

  // PATCH /orders/:id/status  — restaurant/admin advances an order's status.
  async updateOrderStatus(req, res) {
    try {
      const { status, eta_minutes, cancel_reason } = req.body;
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

      order.status = status;
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
