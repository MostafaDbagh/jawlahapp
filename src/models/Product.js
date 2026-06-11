const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

// One selectable add-on (e.g. "بطاطا مقلية" +3000, "كولا" +2000).
// `popular` flags the most-ordered choice (e.g. the top flavour / appetizer);
// `image` lets richer add-ons (appetizers, combos) carry their own photo.
const optionItemSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0, min: 0 },
  image: { type: String, default: null },
  popular: { type: Boolean, default: false }
}, { _id: false });

// A group of add-ons the customer chooses from (e.g. "المقبلات", "الحجم").
// multiple=false → single-select (radio); required → at least one must be picked;
// max → cap on how many can be picked (only meaningful when multiple).
// `kind` tags a well-known group the merchant UI renders specially:
// 'flavor' | 'side' | 'meal' | 'appetizer', 'custom' = a merchant-authored
// section with its own title + description (null = an unlabelled/legacy group).
// `description` is a short subtitle shown under the group title (custom groups).
const optionGroupSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  kind: { type: String, default: null },
  name: { type: String, required: true },
  description: { type: String, default: null },
  required: { type: Boolean, default: false },
  multiple: { type: Boolean, default: true },
  max: { type: Number, default: null },
  items: { type: [optionItemSchema], default: [] }
}, { _id: false });

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  branch_id: {
    type: String,
    required: true,
    index: true
  },
  subcategory_id: {
    type: String,
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    required: true,
    index: true
  },
  image: {
    type: String,
    default: null
  },
  // Merchant-controlled percentage discount (0–100). The effective price is
  // derived in getFinalPrice() — never stored — so changing it can't desync.
  discount_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Highlights the item as a best-seller in the storefront.
  is_bestseller: {
    type: Boolean,
    default: false,
    index: true
  },
  // Optional add-on groups (appetizers, drinks, extras, sizes…).
  option_groups: {
    type: [optionGroupSchema],
    default: []
  },
  // Merchant "sold out" toggle — when false the item is hidden from customers
  // but stays in the merchant's menu so it can be switched back on. Distinct from
  // is_active (which is the soft-delete / disabled flag).
  is_available: {
    type: Boolean,
    default: true,
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'products',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Populate virtuals
productSchema.virtual('branch', {
  ref: 'Branch',
  localField: 'branch_id',
  foreignField: 'id',
  justOne: true
});

productSchema.virtual('subcategory', {
  ref: 'Subcategory',
  localField: 'subcategory_id',
  foreignField: 'id',
  justOne: true
});

productSchema.virtual('variations', {
  ref: 'ProductVariation',
  localField: 'id',
  foreignField: 'product_id'
});

// Instance methods
productSchema.methods.getVariations = function getVariations() {
  const ProductVariation = mongoose.model('ProductVariation');
  return ProductVariation.find({ product_id: this.id });
};

productSchema.methods.getActiveOffers = function getActiveOffers() {
  const Offer = mongoose.model('Offer');
  const now = new Date();
  return Offer.find({
    entity_type: 'product',
    entity_id: this.id,
    is_active: true,
    start_date: { $lte: now },
    end_date: { $gte: now }
  });
};

// Pure price computation given the product's already-fetched active offers.
// List endpoints fetch offers in bulk and call this so each product isn't
// issuing its own offer query.
productSchema.methods.computeFinalPrice = function computeFinalPrice(offers = []) {
  let finalPrice = parseFloat(this.price);

  // Merchant's own percentage discount, applied before any campaign offers.
  const pct = Number(this.discount_percentage) || 0;
  if (pct > 0) {
    finalPrice = finalPrice * (1 - Math.min(pct, 100) / 100);
  }

  for (const offer of offers) {
    if (offer.type === 'percentage') {
      finalPrice = finalPrice * (1 - offer.value / 100);
    } else if (offer.type === 'fixed') {
      finalPrice = Math.max(0, finalPrice - offer.value);
    }
  }

  // Prices are whole Syrian Pounds — round any fraction up so a discount never
  // produces a sub-unit price (and never undercharges).
  return Math.ceil(Math.max(0, finalPrice));
};

productSchema.methods.getFinalPrice = async function getFinalPrice() {
  return this.computeFinalPrice(await this.getActiveOffers());
};

// Menu page: find({ branch_id, is_active, is_available }).sort({ created_at: -1 }).
// One compound index covers both the filter and the sort (avoids an in-memory sort).
productSchema.index({ branch_id: 1, is_active: 1, is_available: 1, created_at: -1 });
// Subcategory menu tab: find({ branch_id, subcategory_id, is_active }).
productSchema.index({ branch_id: 1, subcategory_id: 1, is_active: 1 });

attachCommon(productSchema);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
