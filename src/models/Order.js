const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'];

const orderItemSchema = new mongoose.Schema({
  product_id: { type: String, default: null },
  variation_id: { type: String, default: null },
  name: { type: String, required: true },
  image: { type: String, default: null },
  unit_price: { type: Number, required: true, default: 0 },
  qty: { type: Number, required: true, default: 1 },
  options: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const timelineStepSchema = new mongoose.Schema({
  status: { type: String, required: true },
  label: { type: String, default: null },
  at: { type: Date, default: null },
  done: { type: Boolean, default: false }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: { type: String, required: true, index: true },
  branch_id: { type: String, default: null, index: true },
  vendor_name: { type: String, default: null },
  items: { type: [orderItemSchema], default: [] },

  subtotal: { type: Number, required: true, default: 0 },
  delivery_fee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'SYP' },

  // Syria target: cash on delivery only. [[jawlaha-cash-on-delivery-only]]
  payment_method: { type: String, default: 'COD', enum: ['COD'] },

  status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },

  delivery_address: { type: String, default: null },
  delivery_note: { type: String, default: null },
  leave_at_door: { type: Boolean, default: false },
  dont_ring_bell: { type: Boolean, default: false },

  driver: { type: mongoose.Schema.Types.Mixed, default: null }, // { name, vehicle, rating, avatar }
  status_timeline: { type: [timelineStepSchema], default: [] },

  eta_minutes: { type: Number, default: null }
}, {
  collection: 'orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

orderSchema.index({ user_id: 1, created_at: -1 });

// Default linear timeline for a freshly placed order (first step done).
orderSchema.statics.buildTimeline = function buildTimeline(currentStatus = 'pending') {
  const steps = [
    { status: 'pending', label: 'Order placed' },
    { status: 'preparing', label: 'Preparing your order' },
    { status: 'ready', label: 'Ready for pickup' },
    { status: 'on_the_way', label: 'On its way' },
    { status: 'delivered', label: 'Delivered' }
  ];
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);
  const now = new Date();
  return steps.map((s, i) => ({
    status: s.status,
    label: s.label,
    done: i <= currentIdx,
    at: i <= currentIdx ? now : null
  }));
};

attachCommon(orderSchema);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
