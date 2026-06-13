const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const Complaint = require('../models/Complaint');
const ContactRequest = require('../models/ContactRequest');
const Promotion = require('../models/Promotion');
const PlatformSetting = require('../models/PlatformSetting');
const ResponseHelper = require('../utils/responseHelper');
const dispatchService = require('../services/dispatchService');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ACCOUNT_TYPES = [
  'CUSTOMER', 'DRIVER', 'SERVICE_PROVIDER_OWNER', 'SERVICE_PROVIDER_ADMIN',
  'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'CUSTOMER_SERVICE'
];

// Status groups the admin orders board filters by. "active" = in progress /
// not yet completed; "completed" = delivered; "issues" = cancelled.
const ORDER_GROUPS = {
  active: ['pending', 'preparing', 'ready', 'on_the_way'],
  completed: ['delivered'],
  issues: ['cancelled']
};

// Parse a full international phone string ("+963949112178") into stored shape,
// matching the OTP-login flow so an admin-created driver can phone-login later.
function parsePhone(rawPhone) {
  const clean = String(rawPhone || '').replace(/^\+/, '');
  const phone_number = clean.slice(-10);
  const country_code = `+${clean.slice(0, -10) || '963'}`;
  return { phone_number, country_code };
}

// Resolve { branchId -> vendorName } and customer contacts for a page of orders.
async function enrichOrders(rows) {
  const branchIds = [...new Set(rows.map((o) => o.branch_id).filter(Boolean))];
  const userIds = [...new Set(rows.map((o) => o.user_id).filter(Boolean))];

  const [branches, users] = await Promise.all([
    branchIds.length
      ? Branch.find({ id: { $in: branchIds } }).select('id name vendor_id city').lean()
      : [],
    userIds.length
      ? User.find({ user_id: { $in: userIds } })
          .select('user_id full_name username country_code phone_number')
          .lean()
      : []
  ]);

  const vendorIds = [...new Set(branches.map((b) => b.vendor_id).filter(Boolean))];
  const vendors = vendorIds.length
    ? await Vendor.find({ id: { $in: vendorIds } }).select('id name').lean()
    : [];

  const branchById = new Map(branches.map((b) => [b.id, b]));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const userById = new Map(users.map((u) => [u.user_id, u]));

  return rows.map((o) => {
    const b = o.branch_id ? branchById.get(o.branch_id) : null;
    const v = b && b.vendor_id ? vendorById.get(b.vendor_id) : null;
    const u = o.user_id ? userById.get(o.user_id) : null;
    return {
      ...o,
      vendor_name: o.vendor_name || (v ? v.name : null),
      branch_name: b ? b.name : null,
      branch_city: b ? b.city : null,
      customer: u
        ? { name: u.full_name || u.username, phone: `${u.country_code}${u.phone_number}` }
        : null
    };
  });
}

class AdminController {
  // GET /admin/overview — full-system snapshot for the dashboard.
  async overview(req, res) {
    try {
      // 14-day trend window (UTC day buckets, matched by the JS keys built below).
      const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
      const since = new Date(dayStart); since.setUTCDate(dayStart.getUTCDate() - 13);
      const deliveredSales = { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } };

      const [
        usersByType,
        vendorTotal, vendorActive, vendorPending, vendorBlocked,
        ordersByStatus, revenueAgg,
        driversOnline,
        complaintsOpen, contactNew,
        promosActive,
        recentOrders,
        dailyAgg,
        topRestaurants
      ] = await Promise.all([
        User.aggregate([{ $group: { _id: '$account_type', count: { $sum: 1 } } }]),
        Vendor.countDocuments({}),
        Vendor.countDocuments({ is_active: true, approval_status: { $nin: ['pending', 'rejected'] } }),
        Vendor.countDocuments({ approval_status: 'pending' }),
        Vendor.countDocuments({ is_active: false }),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Order.aggregate([
          { $match: { status: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        User.countDocuments({ account_type: 'DRIVER', 'metadata.is_online': true }),
        Complaint.countDocuments({ status: 'open' }),
        ContactRequest.countDocuments({ status: 'new' }),
        Promotion.countDocuments({
          is_active: true,
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() }
        }),
        Order.find({}).sort({ created_at: -1 }).limit(8).lean(),
        // Daily orders + delivered sales over the trend window.
        Order.aggregate([
          { $match: { created_at: { $gte: since } } },
          { $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
              orders: { $sum: 1 },
              sales: deliveredSales
          } }
        ]),
        // Busiest restaurants by order count (vendor_name snapshotted on orders).
        Order.aggregate([
          { $match: { vendor_name: { $ne: null } } },
          { $group: { _id: '$vendor_name', orders: { $sum: 1 }, sales: deliveredSales } },
          { $sort: { orders: -1 } },
          { $limit: 5 }
        ])
      ]);

      const userCounts = ACCOUNT_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
      let usersTotal = 0;
      usersByType.forEach((r) => {
        if (r._id) userCounts[r._id] = r.count;
        usersTotal += r.count;
      });

      const orderCounts = Order.ORDER_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
      let ordersTotal = 0;
      ordersByStatus.forEach((r) => {
        if (r._id) orderCounts[r._id] = r.count;
        ordersTotal += r.count;
      });

      const revenue = revenueAgg.length ? revenueAgg[0].total : 0;
      const completed = orderCounts.delivered || 0;
      const aov = completed ? Math.round(revenue / completed) : 0;

      // Zero-fill the 14-day series so the chart always has a full window.
      const dayKeys = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(dayStart); d.setUTCDate(dayStart.getUTCDate() - i);
        dayKeys.push(d.toISOString().slice(0, 10));
      }
      const byDay = new Map((dailyAgg || []).map((r) => [r._id, r]));
      const daily = dayKeys.map((date) => ({
        date,
        orders: byDay.get(date)?.orders || 0,
        sales: byDay.get(date)?.sales || 0
      }));

      const top_restaurants = (topRestaurants || []).map((r) => ({
        name: r._id, orders: r.orders, sales: r.sales
      }));

      const data = {
        users: { total: usersTotal, by_type: userCounts },
        drivers: { total: userCounts.DRIVER || 0, online: driversOnline },
        restaurants: {
          total: vendorTotal,
          active: vendorActive,
          pending: vendorPending,
          blocked: vendorBlocked
        },
        orders: {
          total: ordersTotal,
          by_status: orderCounts,
          active: ORDER_GROUPS.active.reduce((s, st) => s + (orderCounts[st] || 0), 0),
          completed,
          cancelled: orderCounts.cancelled || 0,
          revenue,
          aov,
          currency: 'SYP'
        },
        complaints: { open: complaintsOpen },
        contact: { new: contactNew },
        promotions: { active: promosActive },
        daily,
        top_restaurants,
        recent_orders: await enrichOrders(recentOrders)
      };

      return ResponseHelper.item(res, data, 'System overview retrieved successfully');
    } catch (error) {
      console.error('Admin overview error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve system overview', 500);
    }
  }

  // GET /admin/users — browse all users with filters.
  async listUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { account_type, search, is_active } = req.query;

      const query = {};
      if (account_type && ACCOUNT_TYPES.includes(account_type)) query.account_type = account_type;
      if (is_active !== undefined && is_active !== '') query.is_active = is_active === 'true';
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ full_name: regex }, { username: regex }, { email: regex }, { phone_number: regex }];
      }

      const offset = (page - 1) * limit;
      const [rows, count] = await Promise.all([
        User.find(query)
          .select('-password_hash -salt -two_factor_secret')
          .sort({ created_at: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);

      return ResponseHelper.list(res, rows, count, 'Users retrieved successfully');
    } catch (error) {
      console.error('List users error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve users', 500);
    }
  }

  // PATCH /admin/users/:id/block | /unblock
  async blockUser(req, res) {
    return AdminController.setUserActive(req, res, false, 'User blocked successfully');
  }
  async unblockUser(req, res) {
    return AdminController.setUserActive(req, res, true, 'User unblocked successfully');
  }
  static async setUserActive(req, res, isActive, message) {
    try {
      const user = await User.findOne({ user_id: req.params.id });
      if (!user) return ResponseHelper.error(res, 'User not found', 404);
      // Guard: an admin cannot lock themselves out.
      if (user.user_id === req.user.user_id && !isActive) {
        return ResponseHelper.error(res, 'You cannot block your own account', 400);
      }
      user.is_active = isActive;
      await user.save();
      return ResponseHelper.item(res, user.getPublicProfile(), message);
    } catch (error) {
      console.error('Set user active error:', error);
      return ResponseHelper.error(res, 'Failed to update user status', 500);
    }
  }

  // POST /admin/drivers — create a driver account. The driver later signs in to
  // the driver app by phone OTP, so a password is optional (random if omitted).
  async createDriver(req, res) {
    try {
      const { full_name, phone, country_code, phone_number, vehicle, email, password } = req.body;
      if (!full_name || !String(full_name).trim()) {
        return ResponseHelper.error(res, 'Driver name is required', 400);
      }

      // Accept either a full international `phone` or separate parts.
      let cc = country_code;
      let pn = phone_number;
      if (phone) {
        const parsed = parsePhone(phone);
        cc = parsed.country_code;
        pn = parsed.phone_number;
      }
      if (!cc || !pn) {
        return ResponseHelper.error(res, 'Driver phone number is required', 400);
      }
      cc = cc.startsWith('+') ? cc : `+${cc}`;

      const exists = await User.findOne({
        $or: [
          { country_code: cc, phone_number: pn },
          { country_code: cc.replace(/^\+/, ''), phone_number: pn }
        ]
      });
      if (exists) {
        return ResponseHelper.error(res, 'An account with this phone number already exists', 400);
      }

      const suffix = crypto.randomBytes(4).toString('hex');
      const salt = crypto.randomBytes(32).toString('hex');
      const rawPassword = password && String(password).length >= 6 ? password : crypto.randomBytes(9).toString('base64');
      const hashedPassword = await bcrypt.hash(rawPassword + salt, 12);

      const driver = await User.create({
        username: `driver_${Date.now()}_${suffix}`,
        email: email && String(email).trim() ? String(email).trim().toLowerCase() : `driver_${Date.now()}_${suffix}@driver.jawlah`,
        full_name: String(full_name).trim(),
        country_code: cc,
        phone_number: pn,
        password_hash: hashedPassword,
        salt,
        account_type: 'DRIVER',
        is_verified: true,
        phone_verified: true,
        metadata: { vehicle: vehicle ? String(vehicle).trim() : 'Motorbike', rating: 5, is_online: false }
      });

      return ResponseHelper.item(res, driver.getPublicProfile(), 'Driver created successfully', 201);
    } catch (error) {
      console.error('Create driver error:', error);
      return ResponseHelper.error(res, 'Failed to create driver', 500);
    }
  }

  // GET /admin/drivers — list drivers with lifetime delivery stats.
  async listDrivers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const { search, is_active } = req.query;

      const query = { account_type: 'DRIVER' };
      if (is_active !== undefined && is_active !== '') query.is_active = is_active === 'true';
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ full_name: regex }, { username: regex }, { phone_number: regex }];
      }

      const offset = (page - 1) * limit;
      const [rows, count] = await Promise.all([
        User.find(query).select('-password_hash -salt -two_factor_secret').sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
        User.countDocuments(query)
      ]);

      // Per-driver delivered count + earnings (driver keeps the delivery fee).
      const ids = rows.map((d) => d.user_id);
      const stats = ids.length
        ? await Order.aggregate([
            { $match: { driver_user_id: { $in: ids }, status: 'delivered' } },
            { $group: { _id: '$driver_user_id', deliveries: { $sum: 1 }, earnings: { $sum: '$delivery_fee' } } }
          ])
        : [];
      const statById = new Map(stats.map((s) => [s._id, s]));

      const data = rows.map((d) => {
        const s = statById.get(d.user_id);
        const meta = d.metadata || {};
        return {
          ...d,
          vehicle: meta.vehicle || 'Motorbike',
          rating: typeof meta.rating === 'number' ? meta.rating : 5,
          is_online: !!meta.is_online,
          total_deliveries: s ? s.deliveries : 0,
          total_earnings: s ? s.earnings : 0
        };
      });

      return ResponseHelper.list(res, data, count, 'Drivers retrieved successfully');
    } catch (error) {
      console.error('List drivers error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve drivers', 500);
    }
  }

  // DELETE /admin/drivers/:id — permanently remove a driver account. Refuses while the
  // driver still has an in-progress order assigned, so a live delivery never loses its
  // driver. Delivered/cancelled orders keep the (now-orphaned) driver_user_id for history.
  async deleteDriver(req, res) {
    try {
      const driver = await User.findOne({ user_id: req.params.id, account_type: 'DRIVER' });
      if (!driver) return ResponseHelper.error(res, 'Driver not found', 404);

      const activeOrder = await Order.findOne({
        driver_user_id: driver.user_id,
        status: { $in: ORDER_GROUPS.active }
      }).lean();
      if (activeOrder) {
        return ResponseHelper.error(res, 'Cannot delete a driver with an active delivery in progress', 409);
      }

      await User.deleteOne({ user_id: driver.user_id });
      return ResponseHelper.item(res, { user_id: driver.user_id }, 'Driver deleted successfully');
    } catch (error) {
      console.error('Delete driver error:', error);
      return ResponseHelper.error(res, 'Failed to delete driver', 500);
    }
  }

  // GET /admin/orders — every order on the platform, with rich filters.
  async listOrders(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { status, group, search, branch_id, date_from, date_to } = req.query;

      const query = {};
      if (status && Order.ORDER_STATUSES.includes(status)) {
        query.status = status;
      } else if (group && ORDER_GROUPS[group]) {
        query.status = { $in: ORDER_GROUPS[group] };
      }
      if (branch_id) query.branch_id = branch_id;
      if (date_from || date_to) {
        query.created_at = {};
        if (date_from) query.created_at.$gte = new Date(date_from);
        if (date_to) {
          const end = new Date(date_to);
          end.setHours(23, 59, 59, 999);
          query.created_at.$lte = end;
        }
      }
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ order_id: regex }, { vendor_name: regex }, { delivery_address: regex }];
      }

      const offset = (page - 1) * limit;
      const [rows, count] = await Promise.all([
        Order.find(query).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
        Order.countDocuments(query)
      ]);

      const data = await enrichOrders(rows);
      return res.status(200).json({
        status: true,
        data,
        message: 'Orders retrieved successfully',
        count,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      });
    } catch (error) {
      console.error('Admin list orders error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve orders', 500);
    }
  }

  // GET /admin/vendors — every restaurant, any approval status (incl. pending
  // requests), with branch count + rating. The public /vendors hides these.
  async listVendors(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const { search, approval_status, is_active } = req.query;

      const query = {};
      if (approval_status && ['pending', 'approved', 'rejected'].includes(approval_status)) {
        query.approval_status = approval_status;
      }
      if (is_active !== undefined && is_active !== '') query.is_active = is_active === 'true';
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ name: regex }, { about: regex }];
      }

      const offset = (page - 1) * limit;
      const [vendors, count, pendingCount] = await Promise.all([
        Vendor.find(query).sort({ created_at: -1 }).skip(offset).limit(limit),
        Vendor.countDocuments(query),
        Vendor.countDocuments({ approval_status: 'pending' })
      ]);

      const data = await Promise.all(
        vendors.map(async (vendor) => {
          const branchCount = await vendor.getActiveBranchesCount();
          const rating = await vendor.getAverageRating();
          return {
            ...vendor.toJSON(),
            branch_count: branchCount,
            average_rating: rating.averageRating,
            total_reviews: rating.totalReviews,
            is_subscription_active: vendor.isSubscriptionActive()
          };
        })
      );

      return res.status(200).json({
        status: true,
        data,
        message: 'Vendors retrieved successfully',
        count,
        stats: { pending: pendingCount }
      });
    } catch (error) {
      console.error('Admin list vendors error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve vendors', 500);
    }
  }

  // POST /admin/orders/:id/redispatch — escape hatch for a stuck order. Clears
  // any outstanding offer + the exhausted flag and re-runs dispatch. With
  // { reset: true } it also reclaims a stuck driver (driver_user_id->null,
  // status->ready) — e.g. a driver who claimed but never picked up.
  async redispatchOrder(req, res) {
    try {
      const { id } = req.params;
      const force = !!(req.body && (req.body.reset === true || req.body.force === true));
      const order = await Order.findOne({ order_id: id });
      if (!order) return ResponseHelper.error(res, 'Order not found', 404);

      const update = {
        assignment_attempt: null,
        'dispatch.exhausted': false,
        'dispatch.last_attempt_at': null, // bypass the double-dispatch gate
      };
      if (force && ['ready', 'on_the_way'].includes(order.status)) {
        update.status = 'ready';
        update.driver_user_id = null;
        update.driver = null;
      }
      await Order.updateOne({ order_id: id }, { $set: update });

      const result = await dispatchService.dispatchOrder(id);
      return ResponseHelper.success(res, { redispatched: true, result }, 'Order re-dispatched');
    } catch (error) {
      console.error('Admin redispatch error:', error);
      return ResponseHelper.error(res, 'Failed to re-dispatch order', 500);
    }
  }

  // GET /admin/orders/:id/dispatch-history — full assignment audit for ops/SLA.
  async getDispatchHistory(req, res) {
    try {
      const order = await Order.findOne({ order_id: req.params.id })
        .select('order_id status driver_user_id assignment_attempt assignment_history dispatch')
        .lean();
      if (!order) return ResponseHelper.error(res, 'Order not found', 404);
      return ResponseHelper.success(res, {
        order_id: order.order_id,
        status: order.status,
        driver_user_id: order.driver_user_id || null,
        assignment_attempt: order.assignment_attempt || null,
        assignment_history: order.assignment_history || [],
        dispatch: order.dispatch || null,
      }, 'Dispatch history retrieved');
    } catch (error) {
      console.error('Admin dispatch history error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve dispatch history', 500);
    }
  }

  // GET /admin/settings — platform-wide config (delivery pricing, support, …).
  async getSettings(req, res) {
    try {
      const settings = await PlatformSetting.getSingleton();
      return ResponseHelper.item(res, settings.toJSON(), 'Platform settings retrieved');
    } catch (error) {
      console.error('Admin get settings error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve platform settings', 500);
    }
  }

  // PUT /admin/settings — update platform config. Delivery pricing is set here,
  // by the company, never by a merchant.
  async updateSettings(req, res) {
    try {
      const settings = await PlatformSetting.getSingleton();
      const { delivery_fee, city_delivery_fees, free_delivery_min_subtotal, currency, support_phone, support_email } = req.body;

      const nonNeg = (v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? n : null;
      };

      if (delivery_fee !== undefined) {
        const v = nonNeg(delivery_fee);
        if (v === null) return ResponseHelper.error(res, 'delivery_fee must be a non-negative number', 400);
        settings.delivery_fee = v;
      }
      if (free_delivery_min_subtotal !== undefined) {
        const v = nonNeg(free_delivery_min_subtotal);
        if (v === null) return ResponseHelper.error(res, 'free_delivery_min_subtotal must be a non-negative number', 400);
        settings.free_delivery_min_subtotal = v;
      }
      if (city_delivery_fees !== undefined) {
        if (!Array.isArray(city_delivery_fees)) {
          return ResponseHelper.error(res, 'city_delivery_fees must be an array', 400);
        }
        // Drop rows without a city name; coerce fees to non-negative numbers.
        settings.city_delivery_fees = city_delivery_fees
          .filter((c) => c && typeof c.city === 'string' && c.city.trim())
          .map((c) => ({ city: c.city.trim(), fee: nonNeg(c.fee) ?? 0 }));
      }
      if (currency !== undefined) settings.currency = String(currency).trim() || 'SYP';
      if (support_phone !== undefined) settings.support_phone = support_phone ? String(support_phone).trim() : null;
      if (support_email !== undefined) settings.support_email = support_email ? String(support_email).trim() : null;

      await settings.save();
      return ResponseHelper.item(res, settings.toJSON(), 'Platform settings updated');
    } catch (error) {
      console.error('Admin update settings error:', error);
      return ResponseHelper.error(res, 'Failed to update platform settings', 500);
    }
  }
}

module.exports = new AdminController();
