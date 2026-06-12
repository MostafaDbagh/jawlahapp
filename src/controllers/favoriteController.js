const Favorite = require('../models/Favorite');
const { FAVORITE_TYPES } = require('../models/Favorite');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const ResponseHelper = require('../utils/responseHelper');

class FavoriteController {
  // GET /favorites — the user's favorites with the product/branch resolved.
  // Items that were removed from the catalog since being favorited are
  // filtered out (not an error — the merchant may have edited the menu).
  async list(req, res) {
    try {
      const favorites = await Favorite.find({ user_id: req.user.user_id }).sort({ created_at: -1 });

      const productIds = favorites.filter((f) => f.item_type === 'product').map((f) => f.item_id);
      const branchIds = favorites.filter((f) => f.item_type === 'branch').map((f) => f.item_id);
      const [products, branches] = await Promise.all([
        productIds.length ? Product.find({ id: { $in: productIds }, is_active: true }) : [],
        branchIds.length ? Branch.find({ id: { $in: branchIds }, is_active: true }) : []
      ]);
      const byId = new Map([
        ...products.map((p) => [`product:${p.id}`, p]),
        ...branches.map((b) => [`branch:${b.id}`, b])
      ]);

      const resolved = favorites
        .map((f) => {
          const item = byId.get(`${f.item_type}:${f.item_id}`);
          return item
            ? { item_type: f.item_type, item_id: f.item_id, created_at: f.created_at, item }
            : null;
        })
        .filter(Boolean);

      res.json(ResponseHelper.success({ favorites: resolved }, 'Favorites retrieved successfully', resolved.length));
    } catch (error) {
      console.error('List favorites error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get favorites', error.message, 0));
    }
  }

  // POST /favorites  { item_type, item_id } — idempotent add.
  async add(req, res) {
    try {
      const { item_type, item_id } = req.body;
      if (!FAVORITE_TYPES.includes(item_type) || !item_id) {
        return res.status(400).json(ResponseHelper.error('item_type (product|branch) and item_id are required', null, 0));
      }

      // The item must actually exist — a favorite of nothing renders nothing.
      const Model = item_type === 'product' ? Product : Branch;
      const item = await Model.findOne({ id: item_id, is_active: true });
      if (!item) {
        return res.status(404).json(ResponseHelper.error(`${item_type} not found`, null, 0));
      }

      await Favorite.updateOne(
        { user_id: req.user.user_id, item_type, item_id },
        { $setOnInsert: { user_id: req.user.user_id, item_type, item_id } },
        { upsert: true }
      );
      res.json(ResponseHelper.success({ item_type, item_id, favorited: true }, 'Added to favorites', 1));
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json(ResponseHelper.error('Failed to add favorite', error.message, 0));
    }
  }

  // DELETE /favorites/:item_type/:item_id — idempotent remove.
  async remove(req, res) {
    try {
      const { item_type, item_id } = req.params;
      if (!FAVORITE_TYPES.includes(item_type)) {
        return res.status(400).json(ResponseHelper.error('item_type must be product or branch', null, 0));
      }
      await Favorite.deleteOne({ user_id: req.user.user_id, item_type, item_id });
      res.json(ResponseHelper.success({ item_type, item_id, favorited: false }, 'Removed from favorites', 1));
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json(ResponseHelper.error('Failed to remove favorite', error.message, 0));
    }
  }
}

module.exports = new FavoriteController();
