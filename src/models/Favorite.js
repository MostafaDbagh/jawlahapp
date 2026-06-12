const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

// A user's favorite, either a product (dish) or a branch (restaurant).
// Only the reference is stored — details are resolved at read time so the
// list always reflects the current menu.
const FAVORITE_TYPES = ['product', 'branch'];

const favoriteSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  item_type: {
    type: String,
    enum: FAVORITE_TYPES,
    required: true
  },
  item_id: {
    type: String,
    required: true
  }
}, {
  collection: 'favorites',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// One favorite per user+item; toggling twice must not duplicate.
favoriteSchema.index({ user_id: 1, item_type: 1, item_id: 1 }, { unique: true });

attachCommon(favoriteSchema);

module.exports = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);
module.exports.FAVORITE_TYPES = FAVORITE_TYPES;
