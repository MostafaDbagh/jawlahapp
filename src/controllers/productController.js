const { v4: uuidv4 } = require('uuid');
const { Product, Branch, Subcategory, ProductVariation, Vendor } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { buildActiveOffersByEntity } = require('../utils/listStats');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Sanitise merchant-supplied add-on groups before they reach Mongoose: drop
// groups/items without a name, coerce prices to non-negative numbers, and ensure
// every group and item carries a stable id (preserved if sent, generated if not).
function normalizeOptionGroups(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((group) => {
      if (!group || typeof group.name !== 'string' || !group.name.trim()) return null;
      const items = (Array.isArray(group.items) ? group.items : [])
        .map((item) => {
          if (!item || typeof item.name !== 'string' || !item.name.trim()) return null;
          const price = Number(item.price);
          return {
            id: item.id || uuidv4(),
            name: item.name.trim(),
            price: Number.isFinite(price) && price > 0 ? price : 0,
            image: typeof item.image === 'string' && item.image.trim() ? item.image.trim() : null,
            popular: !!item.popular
          };
        })
        .filter(Boolean);
      if (items.length === 0) return null;
      const max = Number(group.max);
      return {
        id: group.id || uuidv4(),
        kind: typeof group.kind === 'string' && group.kind.trim() ? group.kind.trim() : null,
        name: group.name.trim(),
        description: typeof group.description === 'string' && group.description.trim() ? group.description.trim() : null,
        required: !!group.required,
        multiple: group.multiple !== false,
        max: Number.isFinite(max) && max > 0 ? max : null,
        items
      };
    })
    .filter(Boolean);
}

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

// Whether the user may manage products on a branch: a platform admin, or the
// owner of the restaurant the branch belongs to.
async function canManageBranch(user, branchId) {
  if (!user || !branchId) return false;
  if (ADMIN_TYPES.includes(user.account_type)) return true;
  const branch = await Branch.findOne({ id: branchId }).select('vendor_id').lean();
  if (!branch) return false;
  const vendor = await Vendor.findOne({ id: branch.vendor_id }).select('owner_user_id').lean();
  return !!(vendor && vendor.owner_user_id && vendor.owner_user_id === user.user_id);
}

// Fields a client may set on a product. Excludes branch_id so a product can
// never be moved to another branch (or restaurant) via the update route.
const PRODUCT_EDITABLE = ['name', 'description', 'price', 'image', 'subcategory_id', 'is_active', 'is_available', 'discount_percentage', 'is_bestseller', 'option_groups'];

class ProductController {
  // GET /branches/:id/products - List products for a branch
  static async getBranchProducts(req, res) {
    try {
      const { id: branch_id } = req.params;
      const {
        page = 1,
        limit = 20,
        subcategory_id,
        search,
        min_price,
        max_price,
        has_offer,
        include_unavailable
      } = req.query;

      const offset = (page - 1) * limit;
      const query = { branch_id, is_active: true };
      // Customers never see sold-out items; the merchant menu passes
      // include_unavailable=1 to also list and manage them.
      if (!(include_unavailable === '1' || include_unavailable === 'true')) {
        query.is_available = { $ne: false };
      }

      // Filter by subcategory
      if (subcategory_id) {
        query.subcategory_id = subcategory_id;
      }

      // Search by name or description
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ name: regex }, { description: regex }];
      }

      // Price range filter
      if (min_price) {
        query.price = { ...query.price, $gte: parseFloat(min_price) };
      }
      if (max_price) {
        query.price = { ...query.price, $lte: parseFloat(max_price) };
      }

      const [products, count] = await Promise.all([
        Product.find(query)
          .populate({ path: 'branch', select: 'id name city' })
          .populate({ path: 'subcategory', select: 'id name image' })
          .populate({ path: 'variations', select: 'id attributes price image' })
          .sort({ created_at: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Product.countDocuments(query)
      ]);

      // Fetch all active offers for this page in one query, then price each
      // product from its offers (no per-product offer query).
      const offersByProduct = await buildActiveOffersByEntity('product', products.map((p) => p.id));
      const productsWithDetails = products
        .map((product) => {
          const activeOffers = offersByProduct[product.id] || [];

          // Apply offer filter
          if (has_offer === 'true' && activeOffers.length === 0) {
            return null;
          }

          const finalPrice = product.computeFinalPrice(activeOffers);
          return {
            ...product.toJSON(),
            final_price: finalPrice,
            active_offers: activeOffers.length,
            has_discount: finalPrice < parseFloat(product.price)
          };
        })
        .filter((product) => product !== null);

      const filteredProducts = productsWithDetails;

      return ResponseHelper.list(res, filteredProducts, count, 'Branch products retrieved successfully');
    } catch (error) {
      console.error('Error getting branch products:', error);
      return ResponseHelper.error(res, 'Failed to retrieve branch products', 500);
    }
  }

  // GET /branches/:branch_id/subcategories/:sub_id/products - Get products by subcategory
  static async getSubcategoryProducts(req, res) {
    try {
      const { branch_id, sub_id } = req.params;
      const { page = 1, limit = 20, search, min_price, max_price } = req.query;

      const offset = (page - 1) * limit;
      // Customer-facing: hide sold-out items.
      const query = { branch_id, subcategory_id: sub_id, is_active: true, is_available: { $ne: false } };

      // Search filter
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ name: regex }, { description: regex }];
      }

      // Price range filter
      if (min_price) {
        query.price = { ...query.price, $gte: parseFloat(min_price) };
      }
      if (max_price) {
        query.price = { ...query.price, $lte: parseFloat(max_price) };
      }

      const [products, count] = await Promise.all([
        Product.find(query)
          .populate({ path: 'subcategory', select: 'id name image' })
          .populate({ path: 'variations', select: 'id attributes price image' })
          .sort({ created_at: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Product.countDocuments(query)
      ]);

      // One offer query for the whole page; price each product from its offers.
      const offersByProduct = await buildActiveOffersByEntity('product', products.map((p) => p.id));
      const productsWithDetails = products.map((product) => {
        const finalPrice = product.computeFinalPrice(offersByProduct[product.id] || []);
        return {
          ...product.toJSON(),
          final_price: finalPrice,
          has_discount: finalPrice < parseFloat(product.price)
        };
      });

      return ResponseHelper.list(res, productsWithDetails, count, 'Subcategory products retrieved successfully');
    } catch (error) {
      console.error('Error getting subcategory products:', error);
      return ResponseHelper.error(res, 'Failed to retrieve subcategory products', 500);
    }
  }

  // GET /products/:id - Get product details
  static async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({ id, is_active: true })
        .populate({ path: 'branch', select: 'id name city address' })
        .populate({ path: 'subcategory', select: 'id name image' })
        .populate({ path: 'variations', select: 'id attributes price image' });

      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      const activeOffers = await product.getActiveOffers();
      const finalPrice = product.computeFinalPrice(activeOffers);

      const productData = {
        ...product.toJSON(),
        final_price: finalPrice,
        active_offers: activeOffers,
        has_discount: finalPrice < parseFloat(product.price)
      };

      return ResponseHelper.item(res, productData, 'Product details retrieved successfully');
    } catch (error) {
      console.error('Error getting product:', error);
      return ResponseHelper.error(res, 'Failed to retrieve product details', 500);
    }
  }

  // POST /branches/:id/products - Add product to branch
  static async createProduct(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { subcategory_id, name, description, price, image, variations, option_groups, discount_percentage, is_bestseller } = req.body;

      // Verify branch exists
      const branch = await Branch.findOne({ id: branch_id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Only the branch's own restaurant (or an admin) may add products to it.
      if (!(await canManageBranch(req.user, branch_id))) {
        return ResponseHelper.error(res, 'You are not allowed to add products to this branch', 403);
      }

      // Verify subcategory exists if provided
      if (subcategory_id) {
        const subcategory = await Subcategory.findOne({ id: subcategory_id, branch_id });
        if (!subcategory) {
          return ResponseHelper.error(res, 'Subcategory not found for this branch', 404);
        }
      }

      const pct = Number(discount_percentage);
      const product = await Product.create({
        branch_id,
        subcategory_id,
        name,
        description,
        price,
        image,
        discount_percentage: Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : 0,
        is_bestseller: !!is_bestseller,
        option_groups: normalizeOptionGroups(option_groups)
      });

      // Add variations if provided
      if (variations && variations.length > 0) {
        const variationData = variations.map((variation) => ({
          product_id: product.id,
          attributes: variation.attributes,
          price: variation.price,
          image: variation.image
        }));

        await ProductVariation.insertMany(variationData);
      }

      const createdProduct = await Product.findOne({ id: product.id })
        .populate({ path: 'branch', select: 'id name city' })
        .populate({ path: 'subcategory', select: 'id name image' })
        .populate({ path: 'variations', select: 'id attributes price image' });

      return ResponseHelper.item(res, createdProduct, 'Product created successfully', 201);
    } catch (error) {
      console.error('Error creating product:', error);
      return ResponseHelper.error(res, 'Failed to create product', 500);
    }
  }

  // PUT /products/:id - Update product
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({ id });
      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      // Only the owning restaurant (or an admin) may edit this product.
      if (!(await canManageBranch(req.user, product.branch_id))) {
        return ResponseHelper.error(res, 'You are not allowed to edit this product', 403);
      }

      // Apply only whitelisted fields — never req.body wholesale.
      const updateData = {};
      for (const key of PRODUCT_EDITABLE) {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      }
      // Add-on groups are sanitised before persisting.
      if (updateData.option_groups !== undefined) {
        updateData.option_groups = normalizeOptionGroups(updateData.option_groups);
      }
      await product.update(updateData);

      const updatedProduct = await Product.findOne({ id })
        .populate({ path: 'branch', select: 'id name city' })
        .populate({ path: 'subcategory', select: 'id name image' })
        .populate({ path: 'variations', select: 'id attributes price image' });

      return ResponseHelper.item(res, updatedProduct, 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      return ResponseHelper.error(res, 'Failed to update product', 500);
    }
  }

  // DELETE /products/:id - Remove product
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({ id });
      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      // Only the owning restaurant (or an admin) may remove this product.
      if (!(await canManageBranch(req.user, product.branch_id))) {
        return ResponseHelper.error(res, 'You are not allowed to delete this product', 403);
      }

      await product.update({ is_active: false });

      return ResponseHelper.success(res, null, 'Product removed successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      return ResponseHelper.error(res, 'Failed to remove product', 500);
    }
  }

  // POST /products/:id/variations - Add product variation
  static async addProductVariation(req, res) {
    try {
      const { id: product_id } = req.params;
      const { attributes, price, image } = req.body;

      const product = await Product.findOne({ id: product_id });
      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      const variation = await ProductVariation.create({
        product_id,
        attributes,
        price,
        image
      });

      return ResponseHelper.item(res, variation, 'Product variation added successfully', 201);
    } catch (error) {
      console.error('Error adding product variation:', error);
      return ResponseHelper.error(res, 'Failed to add product variation', 500);
    }
  }

  // PUT /products/variations/:id - Update product variation
  static async updateProductVariation(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const variation = await ProductVariation.findOne({ id });
      if (!variation) {
        return ResponseHelper.error(res, 'Product variation not found', 404);
      }

      await variation.update(updateData);

      return ResponseHelper.item(res, variation, 'Product variation updated successfully');
    } catch (error) {
      console.error('Error updating product variation:', error);
      return ResponseHelper.error(res, 'Failed to update product variation', 500);
    }
  }

  // DELETE /products/variations/:id - Delete product variation
  static async deleteProductVariation(req, res) {
    try {
      const { id } = req.params;

      const variation = await ProductVariation.findOne({ id });
      if (!variation) {
        return ResponseHelper.error(res, 'Product variation not found', 404);
      }

      await variation.destroy();

      return ResponseHelper.success(res, null, 'Product variation deleted successfully');
    } catch (error) {
      console.error('Error deleting product variation:', error);
      return ResponseHelper.error(res, 'Failed to delete product variation', 500);
    }
  }
}

module.exports = ProductController;
