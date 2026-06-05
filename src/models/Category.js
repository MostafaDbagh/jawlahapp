const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const categorySchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
    index: true
  },
  image: {
    type: String,
    default: null
  },
  // Decimal between 0 and 1 (e.g. 0.15 for 15% off)
  has_offer: {
    type: Number,
    default: null,
    min: 0,
    max: 1,
    index: true
  },
  free_delivery: {
    type: Boolean,
    default: false,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'categories',
  timestamps: false
});

attachCommon(categorySchema);

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
