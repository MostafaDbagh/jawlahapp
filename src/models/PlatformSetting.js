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
  support_email: { type: String, default: null },

  // --- Jawlaha Box (errand service) pricing & limits — admin-controlled. ---
  // service fee = box_base_fee(city) + extra-item fee + extra-stop fee. Default
  // pricing: 20,000 minimum (covers the first item + one stop), +10,000 per extra
  // item. The admin tunes all of these from the web portal (Settings → صندوق جولة).
  box_base_fee: { type: Number, default: 20000, min: 0 },
  box_city_fees: { type: [cityFeeSchema], default: [] },      // per-city base-fee overrides
  box_extra_item_fee: { type: Number, default: 10000, min: 0 }, // per item beyond box_included_items
  box_extra_stop_fee: { type: Number, default: 2000, min: 0 }, // per pickup stop beyond the first (TBD)
  box_included_items: { type: Number, default: 1, min: 0 },   // items covered by the base fee
  box_max_items: { type: Number, default: 5, min: 1 },        // hard cap on items
  box_max_stops: { type: Number, default: 3, min: 1 },        // hard cap on pickup stops
  box_max_budget: { type: Number, default: 100000, min: 0 }   // max goods budget a customer may set
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

// The effective Jawlaha Box base fee for a city (city override or the global one).
platformSettingSchema.methods.resolveBoxBaseFee = function resolveBoxBaseFee(city) {
  if (city) {
    const override = (this.box_city_fees || []).find((c) => c.city === city);
    if (override && Number.isFinite(Number(override.fee))) return Number(override.fee);
  }
  return Number(this.box_base_fee) || 0;
};

// Server-side Box service fee: base + per-item over the included count + per
// extra stop. Pure function of admin config + item/stop counts (never trusts the
// client). Returns a rounded integer SYP amount.
platformSettingSchema.methods.computeBoxServiceFee = function computeBoxServiceFee({ city, itemCount = 0, stopCount = 1 } = {}) {
  const base = this.resolveBoxBaseFee(city);
  const extraItems = Math.max(0, Number(itemCount) - Number(this.box_included_items || 0));
  const extraStops = Math.max(0, Number(stopCount) - 1);
  const fee = base
    + extraItems * (Number(this.box_extra_item_fee) || 0)
    + extraStops * (Number(this.box_extra_stop_fee) || 0);
  return Math.round(fee);
};

attachCommon(platformSettingSchema);

module.exports = mongoose.models.PlatformSetting || mongoose.model('PlatformSetting', platformSettingSchema);
