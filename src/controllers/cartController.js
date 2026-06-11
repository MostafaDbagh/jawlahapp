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

// Resolve client-supplied add-on selections against the product's own option
// groups. The client only sends references ({ group_id, item_id }); prices and
// names are taken from the product so they can't be tampered with (this is a
// cash-on-delivery app — the resolved price is what the customer pays).
// Returns { options } on success or { error } (a 400 message) on a rule violation.
function resolveSelectedOptions(product, rawSelections) {
  const groups = Array.isArray(product.option_groups) ? product.option_groups : [];
  const selections = Array.isArray(rawSelections) ? rawSelections : [];

  // Group the incoming refs by group id so we can validate per-group rules.
  const byGroup = new Map();
  for (const sel of selections) {
    const groupId = sel && (sel.group_id ?? sel.groupId);
    const itemId = sel && (sel.item_id ?? sel.itemId ?? sel.id);
    if (groupId == null || itemId == null) continue;
    if (!byGroup.has(groupId)) byGroup.set(groupId, []);
    byGroup.get(groupId).push(itemId);
  }

  const resolved = [];
  for (const group of groups) {
    // De-duplicate item ids within the group (a checkbox can't be picked twice),
    // then resolve them against the group — references to items that no longer
    // exist (e.g. the merchant edited the menu) are dropped, not rejected.
    const picked = [...new Set(byGroup.get(group.id) || [])];
    const items = picked
      .map((itemId) => (group.items || []).find((it) => it.id === itemId))
      .filter(Boolean);

    // Validate the group's rules against what actually resolved.
    if (group.required && items.length === 0) {
      return { error: `Please choose an option for "${group.name}"` };
    }
    if (group.multiple === false && items.length > 1) {
      return { error: `Only one option can be selected for "${group.name}"` };
    }
    if (group.max != null && items.length > group.max) {
      return { error: `Choose at most ${group.max} for "${group.name}"` };
    }

    for (const item of items) {
      resolved.push({
        group_id: group.id,
        group_name: group.name,
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0
      });
    }
  }

  return { options: resolved };
}

// A stable signature of a line's selected add-ons, used so two lines of the same
// product+variation but different add-ons don't merge into one.
function optionsSignature(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  return options.map((o) => o.id).sort().join(',');
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

  // POST /cart/items  { product_id, qty?, variation_id?, options?, note? }
  async addItem(req, res) {
    try {
      const { product_id, qty = 1, variation_id = null, options = null, note = null } = req.body;

      // Free-text special request for this line ("extra garlic, no pomegranate
      // sauce"). Trimmed and capped; it never affects the price.
      const lineNote =
        typeof note === 'string' && note.trim() ? note.trim().slice(0, 300) : null;

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

      // Resolve add-on selections against the product (server-side prices + rules).
      const { options: resolvedOptions, error: optionsError } = resolveSelectedOptions(product, options);
      if (optionsError) {
        return res.status(400).json(ResponseHelper.error(optionsError, null, 0));
      }
      const lineOptions = resolvedOptions.length > 0 ? resolvedOptions : null;
      const optionsSig = optionsSignature(resolvedOptions);

      const cart = await getOrCreateCart(req.user.user_id);

      // Single-restaurant cart: an order can only contain items from one branch.
      // Adding a product from a different restaurant resets the previous cart.
      let cartReset = false;
      if (
        cart.items.length > 0 &&
        product.branch_id != null &&
        String(cart.items[0].branch_id) !== String(product.branch_id)
      ) {
        cart.items = [];
        cartReset = true;
      }

      // Merge with an existing identical line (same product + variation +
      // add-ons + note). A different note keeps its own line so the kitchen
      // sees each request against the right quantity.
      const existing = cart.items.find(
        (it) =>
          it.product_id === product_id &&
          it.variation_id === variation_id &&
          optionsSignature(it.options) === optionsSig &&
          (it.note || null) === lineNote
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
          options: lineOptions,
          note: lineNote
        });
      }

      await cart.save();
      res.json(
        ResponseHelper.success(
          { ...serialize(cart), cart_reset: cartReset },
          cartReset ? 'Started a new cart from this restaurant' : 'Item added to cart',
          1
        )
      );
    } catch (error) {
      console.error('Add cart item error:', error);
      res.status(500).json(ResponseHelper.error('Failed to add item', error.message, 0));
    }
  }

  // PATCH /cart/items/:line_key  { qty }
  // line_key matches a line id first, falling back to product_id for older
  // clients (which addressed lines by product before per-line ids existed).
  async updateItem(req, res) {
    try {
      const { product_id: lineKey } = req.params;
      const { qty } = req.body;
      const cart = await getOrCreateCart(req.user.user_id);

      let targetIdx = cart.items.findIndex((it) => it.id === lineKey);
      if (targetIdx < 0) targetIdx = cart.items.findIndex((it) => it.product_id === lineKey);
      if (targetIdx < 0) {
        return res.status(404).json(ResponseHelper.error('Item not found in cart', null, 0));
      }

      const newQty = Number(qty);
      if (!newQty || newQty <= 0) {
        // qty 0 (or less) removes the line.
        cart.items.splice(targetIdx, 1);
      } else {
        cart.items[targetIdx].qty = newQty;
      }

      await cart.save();
      res.json(ResponseHelper.success(serialize(cart), 'Cart updated', 1));
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json(ResponseHelper.error('Failed to update item', error.message, 0));
    }
  }

  // DELETE /cart/items/:line_key  (line id first, product_id fallback)
  async removeItem(req, res) {
    try {
      const { product_id: lineKey } = req.params;
      const cart = await getOrCreateCart(req.user.user_id);
      let targetIdx = cart.items.findIndex((it) => it.id === lineKey);
      if (targetIdx < 0) targetIdx = cart.items.findIndex((it) => it.product_id === lineKey);
      if (targetIdx >= 0) cart.items.splice(targetIdx, 1);
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
// Exported for unit testing the add-on resolution/price-integrity logic.
module.exports.resolveSelectedOptions = resolveSelectedOptions;
