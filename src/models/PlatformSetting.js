const mongoose = require('mongoose');
const { attachCommon } = require('./baseSchema');

// Per-city delivery-fee override. When a city has no entry the global
// `delivery_fee` applies.
const cityFeeSchema = new mongoose.Schema({
  city: { type: String, required: true },
  fee: { type: Number, required: true, default: 0, min: 0 }
}, { _id: false });

// Platform-wide configuration the company controls from the admin board.
// Stored as a single document (key: 'platform'); use getSingleton() to read it.
// Delivery pricing lives here — NOT on the restaurant — so the company sets it.
const platformSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'platform', unique: true, index: true },
  // Flat delivery fee charged on every order (SYP). Seeded from the legacy
  // DELIVERY_FEE env var so behaviour is unchanged until the company edits it.
  delivery_fee: { type: Number, default: () => Number(process.env.DELIVERY_FEE) || 10000, min: 0 },
  // Per-city overrides of the flat fee (Syria spans several cities).
  city_delivery_fees: { type: [cityFeeSchema], default: [] },
  // Orders at/above this subtotal get free delivery. 0 disables the rule.
  free_delivery_min_subtotal: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'SYP' },
  support_phone: { type: String, default: null },
  support_email: { type: String, default: null }
}, {
  collection: 'platform_settings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Read (or lazily create) the single platform-settings document.
platformSettingSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ key: 'platform' });
  if (!doc) doc = await this.create({ key: 'platform' });
  return doc;
};

// The effective delivery fee for a city — a city override if one exists,
// otherwise the global flat fee.
platformSettingSchema.methods.resolveDeliveryFee = function resolveDeliveryFee(city) {
  if (city) {
    const override = (this.city_delivery_fees || []).find((c) => c.city === city);
    if (override && Number.isFinite(Number(override.fee))) return Number(override.fee);
  }
  return Number(this.delivery_fee) || 0;
};

attachCommon(platformSettingSchema);

module.exports = mongoose.models.PlatformSetting || mongoose.model('PlatformSetting', platformSettingSchema);
