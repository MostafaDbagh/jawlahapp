const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

// One cart per user. Items are denormalised snapshots so the cart keeps
// rendering even if a product/price changes after it was added.
const cartItemSchema = new mongoose.Schema({
  // Stable per-line id so the same product with different add-ons forms distinct
  // lines that can be updated/removed independently.
  id: { type: String, default: uuidv4 },
  product_id: { type: String, required: true },
  variation_id: { type: String, default: null },
  branch_id: { type: String, default: null },
  name: { type: String, required: true },
  image: { type: String, default: null },
  unit_price: { type: Number, required: true, default: 0 },
  qty: { type: Number, required: true, default: 1, min: 1 },
  // Free-form selected options/add-ons (e.g. [{ name, price }])
  options: { type: mongoose.Schema.Types.Mixed, default: null },
  // Customer's free-text request for this line (e.g. "extra garlic, no
  // pomegranate sauce"). Informational only — never affects pricing.
  note: { type: String, default: null }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  cart_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: { type: [cartItemSchema], default: [] }
}, {
  collection: 'carts',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Computed totals used by the cart/checkout screens.
cartSchema.methods.getSummary = function getSummary() {
  const subtotal = this.items.reduce((sum, it) => {
    const optionsTotal = Array.isArray(it.options)
      ? it.options.reduce((s, o) => s + (Number(o.price) || 0), 0)
      : 0;
    return sum + (Number(it.unit_price) + optionsTotal) * Number(it.qty);
  }, 0);
  return {
    items_count: this.items.reduce((n, it) => n + Number(it.qty), 0),
    subtotal: Math.round(subtotal * 100) / 100
  };
};

attachCommon(cartSchema);

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
