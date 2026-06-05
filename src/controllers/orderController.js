const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Branch = require('../models/Branch');
const Vendor = require('../models/Vendor');
const ResponseHelper = require('../utils/responseHelper');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

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

class OrderController {
  // POST /orders  — checkout from the user's cart (Cash on Delivery)
  async createOrder(req, res) {
    try {
      const userId = req.user.user_id;
      const {
        delivery_address = null,
        delivery_note = null,
        leave_at_door = false,
        dont_ring_bell = false
      } = req.body;

      const cart = await Cart.findOne({ user_id: userId });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json(ResponseHelper.error('Cart is empty', null, 0));
      }

      const branchId = cart.items[0].branch_id || null;
      let deliveryFee = 0;
      let vendorName = null;
      if (branchId) {
        const branch = await Branch.findOne({ id: branchId });
        if (branch) {
          deliveryFee = branch.free_delivery ? 0 : Number(branch.delivery_fee) || 0;
        }
      }

      const subtotal = cart.items.reduce((sum, it) => sum + lineTotal(it), 0);
      const discount = 0;
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
          options: it.options
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        delivery_fee: deliveryFee,
        discount,
        total: Math.round(total * 100) / 100,
        currency: 'SYP',
        payment_method: 'COD',
        status: 'pending',
        delivery_address,
        delivery_note,
        leave_at_door: !!leave_at_door,
        dont_ring_bell: !!dont_ring_bell,
        status_timeline: Order.buildTimeline('pending'),
        eta_minutes: 35
      });

      // Empty the cart after a successful checkout.
      cart.items = [];
      await cart.save();

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

  // PATCH /orders/:id/cancel
  async cancelOrder(req, res) {
    try {
      const order = await Order.findOne({ order_id: req.params.id, user_id: req.user.user_id });
      if (!order) {
        return res.status(404).json(ResponseHelper.error('Order not found', null, 0));
      }
      if (['delivered', 'cancelled'].includes(order.status)) {
        return res.status(400).json(
          ResponseHelper.error(`Cannot cancel a ${order.status} order`, null, 0)
        );
      }
      order.status = 'cancelled';
      order.status_timeline = [
        ...order.status_timeline,
        { status: 'cancelled', label: 'Order cancelled', at: new Date(), done: true }
      ];
      await order.save();
      res.json(ResponseHelper.success(order, 'Order cancelled', 1));
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json(ResponseHelper.error('Failed to cancel order', error.message, 0));
    }
  }

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

      res.json(
        ResponseHelper.success({
          orders: rows,
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
      const { status } = req.body;
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

      order.status = status;
      order.status_timeline = [
        ...order.status_timeline,
        { status, label: `Status: ${status}`, at: new Date(), done: true }
      ];
      await order.save();

      res.json(ResponseHelper.success(order, 'Order status updated', 1));
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json(ResponseHelper.error('Failed to update order status', error.message, 0));
    }
  }
}

module.exports = new OrderController();
