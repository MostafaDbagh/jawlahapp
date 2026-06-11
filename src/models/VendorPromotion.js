const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

// A promo banner a restaurant authors for its own page in the customer app
// (the cards under "Promotions" on the vendor-details screen). Unlike the
// platform-wide Promotion model (admin discount codes applied at checkout),
// these are display-only banners owned by a single vendor — `code` is just text
// shown to the customer, not validated at checkout.
const vendorPromotionSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  vendor_id: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  // Optional display code (e.g. "WELCOME20"). Informational only.
  code: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  // Lower values lead; ties fall back to most-recent.
  sort_order: {
    type: Number,
    default: 0
  }
}, {
  collection: 'vendor_promotions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Customer read path: find({ vendor_id, is_active }).sort({ sort_order: 1, created_at: -1 }).
vendorPromotionSchema.index({ vendor_id: 1, is_active: 1, sort_order: 1, created_at: -1 });

attachCommon(vendorPromotionSchema);

module.exports = mongoose.models.VendorPromotion || mongoose.model('VendorPromotion', vendorPromotionSchema);
