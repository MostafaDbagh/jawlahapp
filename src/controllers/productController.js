const { Product, Branch, Subcategory, ProductVariation, Offer } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

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
        has_offer
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { branch_id, is_active: true };

      // Filter by subcategory
      if (subcategory_id) {
        whereClause.subcategory_id = subcategory_id;
      }

      // Search by name or description
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Price range filter
      if (min_price) {
        whereClause.price = { ...whereClause.price, [Op.gte]: parseFloat(min_price) };
      }
      if (max_price) {
        whereClause.price = { ...whereClause.price, [Op.lte]: parseFloat(max_price) };
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name', 'image'],
            required: false
          },
          {
            model: ProductVariation,
            as: 'variations',
            attributes: ['id', 'attributes', 'price', 'image']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Add final price and offers for each product
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const finalPrice = await product.getFinalPrice();
          const activeOffers = await product.getActiveOffers();

          // Apply offer filter
          if (has_offer === 'true' && activeOffers.length === 0) {
            return null;
          }

          return {
            ...product.toJSON(),
            final_price: finalPrice,
            active_offers: activeOffers.length,
            has_discount: finalPrice < parseFloat(product.price)
          };
        })
      );

      const filteredProducts = productsWithDetails.filter(product => product !== null);

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
      const whereClause = { branch_id, subcategory_id: sub_id, is_active: true };

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Price range filter
      if (min_price) {
        whereClause.price = { ...whereClause.price, [Op.gte]: parseFloat(min_price) };
      }
      if (max_price) {
        whereClause.price = { ...whereClause.price, [Op.lte]: parseFloat(max_price) };
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name', 'image']
          },
          {
            model: ProductVariation,
            as: 'variations',
            attributes: ['id', 'attributes', 'price', 'image']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Add final price for each product
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const finalPrice = await product.getFinalPrice();
          return {
            ...product.toJSON(),
            final_price: finalPrice,
            has_discount: finalPrice < parseFloat(product.price)
          };
        })
      );

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

      const product = await Product.findOne({
        where: { id, is_active: true },
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city', 'address']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name', 'image'],
            required: false
          },
          {
            model: ProductVariation,
            as: 'variations',
            attributes: ['id', 'attributes', 'price', 'image']
          }
        ]
      });

      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      const finalPrice = await product.getFinalPrice();
      const activeOffers = await product.getActiveOffers();

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
      const { subcategory_id, name, description, price, image, variations } = req.body;

      // Verify branch exists
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Verify subcategory exists if provided
      if (subcategory_id) {
        const subcategory = await Subcategory.findOne({
          where: { id: subcategory_id, branch_id }
        });
        if (!subcategory) {
          return ResponseHelper.error(res, 'Subcategory not found for this branch', 404);
        }
      }

      const product = await Product.create({
        branch_id,
        subcategory_id,
        name,
        description,
        price,
        image
      });

      // Add variations if provided
      if (variations && variations.length > 0) {
        const variationData = variations.map(variation => ({
          product_id: product.id,
          attributes: variation.attributes,
          price: variation.price,
          image: variation.image
        }));

        await ProductVariation.bulkCreate(variationData);
      }

      const createdProduct = await Product.findByPk(product.id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name', 'image'],
            required: false
          },
          {
            model: ProductVariation,
            as: 'variations',
            attributes: ['id', 'attributes', 'price', 'image']
          }
        ]
      });

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
      const updateData = req.body;

      const product = await Product.findByPk(id);
      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      await product.update(updateData);

      const updatedProduct = await Product.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name', 'image'],
            required: false
          },
          {
            model: ProductVariation,
            as: 'variations',
            attributes: ['id', 'attributes', 'price', 'image']
          }
        ]
      });

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

      const product = await Product.findByPk(id);
      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
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

      const product = await Product.findByPk(product_id);
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

      const variation = await ProductVariation.findByPk(id);
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

      const variation = await ProductVariation.findByPk(id);
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
