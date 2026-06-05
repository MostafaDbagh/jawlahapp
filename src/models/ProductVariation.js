const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const productVariationSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  product_id: {
    type: String,
    required: true,
    index: true
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  price: {
    type: Number,
    default: null
  },
  image: {
    type: String,
    default: null
  }
}, {
  collection: 'product_variations',
  timestamps: false
});

attachCommon(productVariationSchema);

module.exports = mongoose.models.ProductVariation || mongoose.model('ProductVariation', productVariationSchema);
