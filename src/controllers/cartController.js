const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ResponseHelper = require('../utils/responseHelper');

// Returns the user's cart document, creating an empty one if missing.
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user_id: userId });
  if (!cart) {
    cart = await Cart.create({ user_id: userId, items: [] });
  }
  return cart;
}

function serialize(cart) {
  return {
    ...cart.toObject(),
    summary: cart.getSummary()
  };
}

class CartController {
  // GET /cart
  async getCart(req, res) {
    try {
      const cart = await getOrCreateCart(req.user.user_id);
      res.json(ResponseHelper.success(serialize(cart), 'Cart retrieved successfully', 1));
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json(ResponseHelper.error('Failed to get cart', error.message, 0));
    }
  }

  // POST /cart/items  { product_id, qty?, variation_id?, options? }
  async addItem(req, res) {
    try {
      const { product_id, qty = 1, variation_id = null, options = null } = req.body;

      if (!product_id) {
        return res.status(400).json(ResponseHelper.error('product_id is required', null, 0));
      }

      const product = await Product.findOne({ id: product_id, is_active: true });
      if (!product) {
        return res.status(404).json(ResponseHelper.error('Product not found', null, 0));
      }

      // Resolve unit price (variation overrides product price when present).
      let unitPrice = Number(product.price) || 0;
      if (variation_id) {
        const variation = (await product.getVariations?.()) || [];
        const match = Array.isArray(variation) ? variation.find((v) => v.id === variation_id) : null;
        if (match && match.price != null) unitPrice = Number(match.price);
      }

      const cart = await getOrCreateCart(req.user.user_id);

      // Merge with an existing identical line (same product + variation).
      const existing = cart.items.find(
        (it) => it.product_id === product_id && it.variation_id === variation_id
      );
      if (existing) {
        existing.qty += Number(qty) || 1;
      } else {
        cart.items.push({
          product_id,
          variation_id,
          branch_id: product.branch_id,
          name: product.name,
          image: product.image,
          unit_price: unitPrice,
          qty: Number(qty) || 1,
          options
        });
      }

      await cart.save();
      res.json(ResponseHelper.success(serialize(cart), 'Item added to cart', 1));
    } catch (error) {
      console.error('Add cart item error:', error);
      res.status(500).json(ResponseHelper.error('Failed to add item', error.message, 0));
    }
  }

  // PATCH /cart/items/:product_id  { qty }
  async updateItem(req, res) {
    try {
      const { product_id } = req.params;
      const { qty } = req.body;
      const cart = await getOrCreateCart(req.user.user_id);

      const item = cart.items.find((it) => it.product_id === product_id);
      if (!item) {
        return res.status(404).json(ResponseHelper.error('Item not found in cart', null, 0));
      }

      const newQty = Number(qty);
      if (!newQty || newQty <= 0) {
        // qty 0 (or less) removes the line.
        cart.items = cart.items.filter((it) => it.product_id !== product_id);
      } else {
        item.qty = newQty;
      }

      await cart.save();
      res.json(ResponseHelper.success(serialize(cart), 'Cart updated', 1));
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json(ResponseHelper.error('Failed to update item', error.message, 0));
    }
  }

  // DELETE /cart/items/:product_id
  async removeItem(req, res) {
    try {
      const { product_id } = req.params;
      const cart = await getOrCreateCart(req.user.user_id);
      cart.items = cart.items.filter((it) => it.product_id !== product_id);
      await cart.save();
      res.json(ResponseHelper.success(serialize(cart), 'Item removed from cart', 1));
    } catch (error) {
      console.error('Remove cart item error:', error);
      res.status(500).json(ResponseHelper.error('Failed to remove item', error.message, 0));
    }
  }

  // DELETE /cart
  async clearCart(req, res) {
    try {
      const cart = await getOrCreateCart(req.user.user_id);
      cart.items = [];
      await cart.save();
      res.json(ResponseHelper.success(serialize(cart), 'Cart cleared', 1));
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json(ResponseHelper.error('Failed to clear cart', error.message, 0));
    }
  }
}

module.exports = new CartController();
module.exports.getOrCreateCart = getOrCreateCart;
