const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const offerSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  entity_type: {
    type: String,
    required: true,
    enum: ['branch', 'subcategory', 'product', 'vendor']
  },
  entity_id: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed', 'buy_x_get_y']
  },
  value: {
    type: Number,
    default: null
  },
  title: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
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
    default: true
  }
}, {
  collection: 'offers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

offerSchema.index({ entity_type: 1, entity_id: 1, is_active: 1 });
offerSchema.index({ start_date: 1, end_date: 1, is_active: 1 });

// Instance methods
offerSchema.methods.isValid = function isValid() {
  const now = new Date();
  return this.is_active &&
    this.start_date <= now &&
    this.end_date >= now;
};

offerSchema.methods.calculateDiscount = function calculateDiscount(originalPrice) {
  if (!this.isValid()) return originalPrice;

  let discountedPrice = parseFloat(originalPrice);

  switch (this.type) {
    case 'percentage':
      discountedPrice = discountedPrice * (1 - this.value / 100);
      break;
    case 'fixed':
      discountedPrice = Math.max(0, discountedPrice - this.value);
      break;
    case 'buy_x_get_y':
      // Implementation depends on specific business logic
      break;
    default:
      break;
  }

  return Math.round(discountedPrice * 100) / 100;
};

attachCommon(offerSchema);

module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
