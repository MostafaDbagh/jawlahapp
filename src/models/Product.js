const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

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

productSchema.methods.getFinalPrice = async function getFinalPrice() {
  const offers = await this.getActiveOffers();
  let finalPrice = parseFloat(this.price);

  for (const offer of offers) {
    if (offer.type === 'percentage') {
      finalPrice = finalPrice * (1 - offer.value / 100);
    } else if (offer.type === 'fixed') {
      finalPrice = Math.max(0, finalPrice - offer.value);
    }
  }

  return Math.round(finalPrice * 100) / 100;
};

attachCommon(productSchema);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
