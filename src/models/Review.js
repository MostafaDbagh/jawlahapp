const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const reviewSchema = new mongoose.Schema({
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
  user_id: {
    type: String,
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true
  },
  comment: {
    type: String,
    default: null
  }
}, {
  collection: 'reviews',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// One review per user per branch
reviewSchema.index({ user_id: 1, branch_id: 1 }, { unique: true });

// Populate virtual
reviewSchema.virtual('branch', {
  ref: 'Branch',
  localField: 'branch_id',
  foreignField: 'id',
  justOne: true
});

attachCommon(reviewSchema);

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);
