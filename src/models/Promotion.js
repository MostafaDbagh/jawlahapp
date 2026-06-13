const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const promotionSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  code: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed', 'free_delivery']
  },
  value: {
    type: Number,
    default: null
  },
  min_order_amount: {
    type: Number,
    default: null
  },
  max_discount: {
    type: Number,
    default: null
  },
  usage_limit: {
    type: Number,
    default: null
  },
  // Max redemptions allowed per customer (null = unlimited). Enforced at
  // checkout by counting the user's prior non-cancelled orders that used this
  // code. Distinct from usage_limit, which is the global cap.
  per_user_limit: {
    type: Number,
    default: null
  },
  used_count: {
    type: Number,
    default: 0
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'promotions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

promotionSchema.index({ start_date: 1, end_date: 1 });

// Instance methods
promotionSchema.methods.isValid = function isValid() {
  const now = new Date();
  return this.is_active &&
    this.start_date <= now &&
    this.end_date >= now &&
    (!this.usage_limit || this.used_count < this.usage_limit);
};

promotionSchema.methods.canUse = function canUse(orderAmount = 0) {
  if (!this.isValid()) return false;

  if (this.min_order_amount && orderAmount < this.min_order_amount) {
    return false;
  }

  return true;
};

promotionSchema.methods.calculateDiscount = function calculateDiscount(orderAmount) {
  if (!this.canUse(orderAmount)) return 0;

  let discount = 0;

  switch (this.type) {
    case 'percentage':
      discount = orderAmount * (this.value / 100);
      if (this.max_discount) {
        discount = Math.min(discount, this.max_discount);
      }
      break;
    case 'fixed':
      discount = this.value;
      break;
    case 'free_delivery':
      discount = 0;
      break;
    default:
      break;
  }

  return Math.round(discount * 100) / 100;
};

attachCommon(promotionSchema);

module.exports = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);
