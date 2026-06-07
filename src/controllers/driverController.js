const Order = require('../models/Order');
const Branch = require('../models/Branch');
const User = require('../models/User');
const ResponseHelper = require('../utils/responseHelper');
const dispatchService = require('../services/dispatchService');
const { driverSnapshot } = require('../utils/driverSnapshot');

// Statuses a driver can move an order through, and where they may move it from.
const DRIVER_TRANSITIONS = {
  on_the_way: 'ready',     // picked up from the restaurant
  delivered: 'on_the_way'  // handed to the customer
};

// Attach the pickup branch ({ name, address, city, lat, lng, image }) to a set
// of orders so the driver app can show where to collect each order. One query.
async function withPickup(orders) {
  const branchIds = [...new Set(orders.map((o) => o.branch_id).filter(Boolean))];
  const branches = branchIds.length
    ? await Branch.find({ id: { $in: branchIds } })
        .select('id name address city lat lng image')
        .lean()
    : [];
  const byId = new Map(branches.map((b) => [b.id, b]));
  return orders.map((o) => {
    const b = o.branch_id ? byId.get(o.branch_id) : null;
    return {
      ...o,
      pickup: b
        ? { name: b.name, address: b.address, city: b.city, lat: b.lat, lng: b.lng, image: b.image }
        : null
    };
  });
}

// Attach the customer contact ({ name, phone }) to a set of orders so the driver
// can call them. Only used for orders the driver has already claimed (active),
// never on the public job board.
async function withCustomer(orders) {
  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ user_id: { $in: userIds } })
        .select('user_id full_name username country_code phone_number')
        .lean()
    : [];
  const byId = new Map(users.map((u) => [u.user_id, u]));
  return orders.map((o) => {
    const u = o.user_id ? byId.get(o.user_id) : null;
    return {
      ...o,
      customer: u
        ? { name: u.full_name || u.username, phone: `${u.country_code}${u.phone_number}` }
        : null
    };
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

class DriverController {
  // GET /driver/orders/available — the job board: orders a restaurant has marked
  // `ready` that no driver has claimed yet.
  async getAvailableOrders(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Open board = ready + unclaimed AND not under a live exclusive offer
      // (an offered order belongs to one driver until the offer expires).
      const query = { status: 'ready', driver_user_id: null, ...dispatchService.notLiveOfferClause() };
      const [rows, count] = await Promise.all([
        Order.find(query).sort({ created_at: 1 }).skip(offset).limit(limit).lean(),
        Order.countDocuments(query)
      ]);

      const orders = await withPickup(rows);
      res.json(
        ResponseHelper.success(
          {
            orders,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              totalItems: count,
              itemsPerPage: limit
            }
          },
          'Available orders retrieved successfully',
          orders.length
        )
      );
    } catch (error) {
      console.error('Get available orders error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get available orders', error.message, 0));
    }
  }

  // GET /driver/orders/active — orders this driver has claimed and is delivering.
  async getActiveOrders(req, res) {
    try {
      const query = {
        driver_user_id: req.user.user_id,
        status: { $in: ['ready', 'on_the_way'] }
      };
      const rows = await Order.find(query).sort({ updated_at: -1 }).lean();
      const orders = await withCustomer(await withPickup(rows));
      res.json(ResponseHelper.success({ orders }, 'Active orders retrieved successfully', orders.length));
    } catch (error) {
      console.error('Get active orders error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get active orders', error.message, 0));
    }
  }

  // GET /driver/orders/history — this driver's completed/cancelled deliveries.
  async getHistory(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const query = {
        driver_user_id: req.user.user_id,
        status: { $in: ['delivered', 'cancelled'] }
      };
      const [rows, count] = await Promise.all([
        Order.find(query).sort({ updated_at: -1 }).skip(offset).limit(limit).lean(),
        Order.countDocuments(query)
      ]);

      res.json(
        ResponseHelper.success(
          {
            orders: rows,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              totalItems: count,
              itemsPerPage: limit
            }
          },
          'Delivery history retrieved successfully',
          rows.length
        )
      );
    } catch (error) {
      console.error('Get driver history error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get delivery history', error.message, 0));
    }
  }

  // POST /driver/orders/:id/accept — atomically claim an available order.
  // The filter (driver_user_id: null, status: ready) makes the update a no-op
  // if another driver already took it, so two drivers can't both win.
  async acceptOrder(req, res) {
    try {
      const snapshot = driverSnapshot(req.user);
      // Board claim also requires no live exclusive offer to another driver, so
      // the board and the offer path can never double-assign the same order.
      const order = await Order.findOneAndUpdate(
        { order_id: req.params.id, status: 'ready', driver_user_id: null, ...dispatchService.notLiveOfferClause() },
        { $set: { driver_user_id: req.user.user_id, driver: snapshot } },
        { new: true }
      );

      if (!order) {
        // Either it doesn't exist, isn't ready yet, or someone else claimed it.
        const exists = await Order.findOne({ order_id: req.params.id }).select('status driver_user_id').lean();
        if (!exists) {
          return res.status(404).json(ResponseHelper.error('Order not found', null, 0));
        }
        return res.status(409).json(
          ResponseHelper.error('Order is no longer available to claim', null, 0)
        );
      }

      res.json(ResponseHelper.success(order, 'Order accepted', 1));
    } catch (error) {
      console.error('Accept order error:', error);
      res.status(500).json(ResponseHelper.error('Failed to accept order', error.message, 0));
    }
  }

  // PATCH /driver/orders/:id/status — driver advances their own order
  // (ready -> on_the_way -> delivered).
  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const allowed = Object.keys(DRIVER_TRANSITIONS);
      if (!status || !allowed.includes(status)) {
        return res.status(400).json(
          ResponseHelper.error(`status must be one of: ${allowed.join(', ')}`, null, 0)
        );
      }

      const order = await Order.findOne({ order_id: req.params.id });
      if (!order) {
        return res.status(404).json(ResponseHelper.error('Order not found', null, 0));
      }
      if (order.driver_user_id !== req.user.user_id) {
        return res.status(403).json(ResponseHelper.error('This order is not assigned to you', null, 0));
      }
      if (order.status !== DRIVER_TRANSITIONS[status]) {
        return res.status(400).json(
          ResponseHelper.error(
            `Cannot move a ${order.status} order to ${status}`,
            null,
            0
          )
        );
      }

      order.status = status;
      order.status_timeline = [
        ...order.status_timeline,
        { status, label: `Status: ${status}`, at: new Date(), done: true }
      ];
      await order.save();

      res.json(ResponseHelper.success(order, 'Order status updated', 1));
    } catch (error) {
      console.error('Driver update status error:', error);
      res.status(500).json(ResponseHelper.error('Failed to update order status', error.message, 0));
    }
  }

  // GET /driver/me/stats — delivery counts + earnings (driver keeps the
  // delivery fee). Today's figures + lifetime totals.
  async getStats(req, res) {
    try {
      const driverId = req.user.user_id;
      const today = startOfToday();

      const [allDelivered, todayDelivered] = await Promise.all([
        Order.find({ driver_user_id: driverId, status: 'delivered' }).select('delivery_fee').lean(),
        Order.find({ driver_user_id: driverId, status: 'delivered', updated_at: { $gte: today } })
          .select('delivery_fee')
          .lean()
      ]);

      const sumFees = (rows) => rows.reduce((s, o) => s + (Number(o.delivery_fee) || 0), 0);

      res.json(
        ResponseHelper.success(
          {
            total_deliveries: allDelivered.length,
            total_earnings: sumFees(allDelivered),
            today_deliveries: todayDelivered.length,
            today_earnings: sumFees(todayDelivered),
            currency: 'SYP'
          },
          'Driver stats retrieved successfully',
          1
        )
      );
    } catch (error) {
      console.error('Get driver stats error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get driver stats', error.message, 0));
    }
  }

  // GET /driver/me — profile + current availability.
  async getProfile(req, res) {
    try {
      const meta = req.user.metadata || {};
      res.json(
        ResponseHelper.success(
          {
            ...req.user.getPublicProfile(),
            is_online: !!meta.is_online,
            vehicle: meta.vehicle || 'Motorbike',
            rating: typeof meta.rating === 'number' ? meta.rating : 5
          },
          'Driver profile retrieved successfully',
          1
        )
      );
    } catch (error) {
      console.error('Get driver profile error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get driver profile', error.message, 0));
    }
  }

  // PATCH /driver/me/availability { is_online } — online/offline toggle, stored
  // on the user's metadata.
  async setAvailability(req, res) {
    try {
      const isOnline = !!req.body.is_online;
      const user = await User.findOne({ user_id: req.user.user_id });
      if (!user) {
        return res.status(404).json(ResponseHelper.error('Driver not found', null, 0));
      }
      user.metadata = { ...(user.metadata || {}), is_online: isOnline };
      user.markModified('metadata');
      await user.save();

      res.json(ResponseHelper.success({ is_online: isOnline }, 'Availability updated', 1));
    } catch (error) {
      console.error('Set availability error:', error);
      res.status(500).json(ResponseHelper.error('Failed to update availability', error.message, 0));
    }
  }

  // GET /driver/offers/pending — this driver's live (non-expired) exclusive
  // offer(s), the real delivery channel since there's no push sender. Each comes
  // with pickup detail + seconds_remaining. Opportunistically sweeps expirations
  // so polling alone keeps dispatch moving even without the background interval.
  async getPendingOffers(req, res) {
    try {
      await dispatchService.sweepExpired().catch(() => {});
      const now = new Date();
      const rows = await Order.find({
        status: 'ready',
        driver_user_id: null,
        'assignment_attempt.driver_user_id': req.user.user_id,
        'assignment_attempt.expires_at': { $gt: now }
      }).lean();

      const withP = await withPickup(rows);
      const offers = withP.map((o) => ({
        ...o,
        offer_id: o.assignment_attempt?.offer_id,
        seconds_remaining: Math.max(
          0,
          Math.round((new Date(o.assignment_attempt.expires_at).getTime() - now.getTime()) / 1000)
        )
      }));

      res.json(ResponseHelper.success({ offers }, 'Pending offers retrieved successfully', offers.length));
    } catch (error) {
      console.error('Get pending offers error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get pending offers', error.message, 0));
    }
  }

  // POST /driver/offers/:offerId/accept — claim an exclusive offer (atomic).
  async acceptOffer(req, res) {
    try {
      const result = await dispatchService.acceptOffer(req.params.offerId, req.user);
      if (result.code === 200) {
        return res.json(ResponseHelper.success(result.order, 'Offer accepted', 1));
      }
      return res.status(result.code).json(ResponseHelper.error(result.message, null, 0));
    } catch (error) {
      console.error('Accept offer error:', error);
      res.status(500).json(ResponseHelper.error('Failed to accept offer', error.message, 0));
    }
  }

  // POST /driver/offers/:offerId/decline — decline; cascades to the next driver.
  async declineOffer(req, res) {
    try {
      const result = await dispatchService.declineOffer(req.params.offerId, req.user);
      if (result.code === 200) {
        return res.json(ResponseHelper.success({ cascaded: !!result.cascaded }, 'Offer declined', 1));
      }
      return res.status(result.code).json(ResponseHelper.error(result.message, null, 0));
    } catch (error) {
      console.error('Decline offer error:', error);
      res.status(500).json(ResponseHelper.error('Failed to decline offer', error.message, 0));
    }
  }
}

module.exports = new DriverController();
