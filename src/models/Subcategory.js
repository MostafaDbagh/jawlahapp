const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const subcategorySchema = new mongoose.Schema({
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
  category_id: {
    type: String,
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  has_offer: {
    type: Boolean,
    default: false
  },
  free_delivery: {
    type: Boolean,
    default: false
  },
  sort_order: {
    type: Number,
    default: 0,
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'subcategories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Populate virtuals
subcategorySchema.virtual('category', {
  ref: 'Category',
  localField: 'category_id',
  foreignField: 'id',
  justOne: true
});

subcategorySchema.virtual('branch', {
  ref: 'Branch',
  localField: 'branch_id',
  foreignField: 'id',
  justOne: true
});

subcategorySchema.virtual('products', {
  ref: 'Product',
  localField: 'id',
  foreignField: 'subcategory_id'
});

// Instance methods
subcategorySchema.methods.getProductCount = function getProductCount() {
  const Product = mongoose.model('Product');
  return Product.countDocuments({ subcategory_id: this.id, is_active: true });
};

subcategorySchema.methods.getActiveOffers = function getActiveOffers() {
  const Offer = mongoose.model('Offer');
  const now = new Date();
  return Offer.find({
    entity_type: 'subcategory',
    entity_id: this.id,
    is_active: true,
    start_date: { $lte: now },
    end_date: { $gte: now }
  });
};

attachCommon(subcategorySchema);

module.exports = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);
