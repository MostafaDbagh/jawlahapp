const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'];

// Jawlaha Box = errand/courier orders (Careem-Box style): the driver buys/picks
// up free-text items from non-restaurant places and delivers, COD. See
// JAWLAHA_BOX.md. A box order's `branch_id`/`vendor_name` stay null; its detail
// lives in the `box` sub-document below.
const ORDER_TYPES = ['restaurant', 'box'];

// One free-text errand item the driver must buy/fetch. `actual_price` is filled
// by the driver while shopping; `status` tracks bought vs not-found.
const boxItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty: { type: Number, default: 1, min: 1 },
  category: { type: String, default: null },   // grocery | cleaning | pharmacy | documents | other
  note: { type: String, default: null },
  stop_index: { type: Number, default: 0 },    // which pickup stop this item belongs to
  status: { type: String, enum: ['pending', 'bought', 'not_found'], default: 'pending' },
  actual_price: { type: Number, default: null }
}, { _id: false });

// One pickup place for a box order (a shop/office, never a listed restaurant).
const boxStopSchema = new mongoose.Schema({
  place_name: { type: String, required: true },
  address: { type: String, default: null },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  note: { type: String, default: null }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  product_id: { type: String, default: null },
  variation_id: { type: String, default: null },
  name: { type: String, required: true },
  image: { type: String, default: null },
  unit_price: { type: Number, required: true, default: 0 },
  qty: { type: Number, required: true, default: 1 },
  options: { type: mongoose.Schema.Types.Mixed, default: null },
  // Customer's free-text request for this line, copied from the cart.
  note: { type: String, default: null }
}, { _id: false });

const timelineStepSchema = new mongoose.Schema({
  status: { type: String, required: true },
  label: { type: String, default: null },
  at: { type: Date, default: null },
  done: { type: Boolean, default: false }
}, { _id: false });

// The live, exclusive dispatch offer outstanding for this order (null when none).
// It is embedded so the offer is part of the same single-document atomic claim
// that assigns the driver — see src/services/dispatchService.js.
const assignmentAttemptSchema = new mongoose.Schema({
  offer_id: { type: String, required: true },
  driver_user_id: { type: String, required: true },
  offered_at: { type: Date, default: null },
  expires_at: { type: Date, default: null },
  sequence: { type: Number, default: 1 },        // position in the cascade chain
  score: { type: Number, default: 0 },
  escalation_round: { type: Number, default: 0 }
}, { _id: false });

// Audit trail of every offer/accept/decline/timeout for this order.
const assignmentHistorySchema = new mongoose.Schema({
  driver_user_id: { type: String, default: null },
  outcome: { type: String, enum: ['offered', 'accepted', 'declined', 'timeout'], required: true },
  at: { type: Date, default: null },
  sequence: { type: Number, default: null },
  score: { type: Number, default: null }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: { type: String, required: true, index: true },
  // 'restaurant' (default) = a normal menu order; 'box' = a Jawlaha Box errand.
  order_type: { type: String, enum: ORDER_TYPES, default: 'restaurant', index: true },
  branch_id: { type: String, default: null, index: true },
  vendor_name: { type: String, default: null },
  items: { type: [orderItemSchema], default: [] },

  // Jawlaha Box payload (null for restaurant orders). `service_fee` is the
  // platform's revenue (resolved server-side); `purchases_total` is the cash the
  // driver fronted for the items; the COD total = purchases_total + service_fee.
  box: {
    type: new mongoose.Schema({
      stops: { type: [boxStopSchema], default: [] },
      items: { type: [boxItemSchema], default: [] },
      budget_cap: { type: Number, default: 0 },     // customer's max spend on goods
      service_fee: { type: Number, default: 0 },     // platform fee (server-computed)
      purchases_total: { type: Number, default: 0 }, // sum of bought items' actual_price
      instructions: { type: String, default: null }
    }, { _id: false }),
    default: null
  },

  subtotal: { type: Number, required: true, default: 0 },
  delivery_fee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  // Promo code applied at checkout (uppercase), null when none. The discount it
  // produced is recorded in `discount` above.
  promo_code: { type: String, default: null },
  total: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'SYP' },

  // Syria target: cash on delivery only. [[jawlaha-cash-on-delivery-only]]
  payment_method: { type: String, default: 'COD', enum: ['COD'] },

  status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
  // Why a cancelled order was rejected (merchant-supplied), null otherwise.
  cancel_reason: { type: String, default: null },
  // When the order was marked delivered. Stable payout timestamp for the
  // driver's earnings (status `updated_at` shifts on any later edit, which
  // would mis-bucket "today's" earnings).
  delivered_at: { type: Date, default: null },

  delivery_address: { type: String, default: null },
  // Optional precise map pin from the customer app, for driver navigation.
  delivery_lat: { type: Number, default: null },
  delivery_lng: { type: Number, default: null },
  delivery_note: { type: String, default: null },
  leave_at_door: { type: Boolean, default: false },
  dont_ring_bell: { type: Boolean, default: false },

  // Real driver assignment. driver_user_id links to the DRIVER User who claimed
  // the order; `driver` is the public display snapshot the customer's tracking
  // screen reads ({ name, vehicle, rating, avatar, phone }).
  driver_user_id: { type: String, default: null, index: true },
  driver: { type: mongoose.Schema.Types.Mixed, default: null },

  // --- Dispatch (push-offer assignment). See src/services/dispatchService.js. ---
  // The single outstanding exclusive offer (null = no live offer; absence means
  // the order is on the open job board). Ownership stays defined solely by
  // driver_user_id; the offer is advisory routing on top of that invariant.
  assignment_attempt: { type: assignmentAttemptSchema, default: null },
  assignment_history: { type: [assignmentHistorySchema], default: [] },
  dispatch: {
    last_attempt_at: { type: Date, default: null },        // advisory double-dispatch gate
    declines: { type: [{ driver_user_id: String, at: Date }], default: [] }, // per-order cooldown (lazy)
    exhausted: { type: Boolean, default: false }           // true once it has fallen back to the open board
  },

  status_timeline: { type: [timelineStepSchema], default: [] },

  eta_minutes: { type: Number, default: null }
}, {
  collection: 'orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

orderSchema.index({ user_id: 1, created_at: -1 });
// Fast lazy sweep of expired exclusive offers (dispatchService.sweepExpired).
orderSchema.index({ 'assignment_attempt.expires_at': 1 });

// Linear delivery timeline with every step up to `currentStatus` marked done.
// Pass the order's existing timeline as `previous` so already-completed steps
// keep their original timestamps instead of being reset to now. Statuses outside
// the linear flow (e.g. 'cancelled') leave every step not-done.
orderSchema.statics.buildTimeline = function buildTimeline(currentStatus = 'pending', previous = []) {
  const steps = [
    { status: 'pending', label: 'Order placed' },
    { status: 'preparing', label: 'Preparing your order' },
    { status: 'ready', label: 'Ready for pickup' },
    { status: 'on_the_way', label: 'On its way' },
    { status: 'delivered', label: 'Delivered' }
  ];
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);
  const now = new Date();
  const prevAt = new Map(
    (previous || []).filter((p) => p && p.at).map((p) => [p.status, p.at])
  );
  return steps.map((s, i) => {
    const done = i <= currentIdx;
    return {
      status: s.status,
      label: s.label,
      done,
      at: done ? (prevAt.get(s.status) || now) : null
    };
  });
};

attachCommon(orderSchema);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.ORDER_TYPES = ORDER_TYPES;
