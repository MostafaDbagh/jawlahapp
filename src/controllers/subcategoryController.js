const { Subcategory, Branch, Category, Product, Offer } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class SubcategoryController {
  // GET /branches/:id/subcategories - List subcategories for a branch
  static async getBranchSubcategories(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { page = 1, limit = 20, has_offer, free_delivery } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { branch_id, is_active: true };

      // Apply filters
      if (has_offer !== undefined) {
        whereClause.has_offer = has_offer === 'true';
      }

      if (free_delivery !== undefined) {
        whereClause.free_delivery = free_delivery === 'true';
      }

      const { count, rows: subcategories } = await Subcategory.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'image']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          }
        ],
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Add product count and active offers for each subcategory
      const subcategoriesWithDetails = await Promise.all(
        subcategories.map(async (subcategory) => {
          const productCount = await subcategory.getProductCount();
          const activeOffers = await subcategory.getActiveOffers();

          return {
            ...subcategory.toJSON(),
            product_count: productCount,
            active_offers: activeOffers.length
          };
        })
      );

      return ResponseHelper.list(res, subcategoriesWithDetails, count, 'Branch subcategories retrieved successfully');
    } catch (error) {
      console.error('Error getting branch subcategories:', error);
      return ResponseHelper.error(res, 'Failed to retrieve branch subcategories', 500);
    }
  }

  // GET /branches/:id/subcategories/:sub_id - Get specific subcategory details
  static async getSubcategoryById(req, res) {
    try {
      const { id: branch_id, sub_id } = req.params;

      const subcategory = await Subcategory.findOne({
        where: { id: sub_id, branch_id, is_active: true },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'image']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city', 'address']
          },
          {
            model: Product,
            as: 'products',
            where: { is_active: true },
            required: false,
            attributes: ['id', 'name', 'price', 'image'],
            limit: 10
          }
        ]
      });

      if (!subcategory) {
        return ResponseHelper.error(res, 'Subcategory not found', 404);
      }

      const productCount = await subcategory.getProductCount();
      const activeOffers = await subcategory.getActiveOffers();

      const subcategoryData = {
        ...subcategory.toJSON(),
        product_count: productCount,
        active_offers: activeOffers
      };

      return ResponseHelper.item(res, subcategoryData, 'Subcategory details retrieved successfully');
    } catch (error) {
      console.error('Error getting subcategory:', error);
      return ResponseHelper.error(res, 'Failed to retrieve subcategory details', 500);
    }
  }

  // POST /branches/:id/subcategories - Assign subcategory to branch
  static async createSubcategory(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { category_id, name, image, has_offer, free_delivery, sort_order } = req.body;

      // Verify branch exists
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Verify category exists
      const category = await Category.findByPk(category_id);
      if (!category) {
        return ResponseHelper.error(res, 'Category not found', 404);
      }

      // Check if subcategory already exists for this branch
      const existingSubcategory = await Subcategory.findOne({
        where: { branch_id, category_id, name }
      });

      if (existingSubcategory) {
        return ResponseHelper.error(res, 'Subcategory already exists for this branch', 400);
      }

      const subcategory = await Subcategory.create({
        branch_id,
        category_id,
        name,
        image,
        has_offer: has_offer || false,
        free_delivery: free_delivery || false,
        sort_order: sort_order || 0
      });

      const createdSubcategory = await Subcategory.findByPk(subcategory.id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'image']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          }
        ]
      });

      return ResponseHelper.item(res, createdSubcategory, 'Subcategory created successfully', 201);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      return ResponseHelper.error(res, 'Failed to create subcategory', 500);
    }
  }

  // PUT /branches/:id/subcategories/:sub_id - Update subcategory settings
  static async updateSubcategory(req, res) {
    try {
      const { id: branch_id, sub_id } = req.params;
      const updateData = req.body;

      const subcategory = await Subcategory.findOne({
        where: { id: sub_id, branch_id }
      });

      if (!subcategory) {
        return ResponseHelper.error(res, 'Subcategory not found', 404);
      }

      await subcategory.update(updateData);

      const updatedSubcategory = await Subcategory.findByPk(subcategory.id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'image']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          }
        ]
      });

      return ResponseHelper.item(res, updatedSubcategory, 'Subcategory updated successfully');
    } catch (error) {
      console.error('Error updating subcategory:', error);
      return ResponseHelper.error(res, 'Failed to update subcategory', 500);
    }
  }

  // DELETE /branches/:id/subcategories/:sub_id - Remove subcategory from branch
  static async deleteSubcategory(req, res) {
    try {
      const { id: branch_id, sub_id } = req.params;

      const subcategory = await Subcategory.findOne({
        where: { id: sub_id, branch_id }
      });

      if (!subcategory) {
        return ResponseHelper.error(res, 'Subcategory not found', 404);
      }

      // Check if subcategory has products
      const productCount = await subcategory.getProductCount();
      if (productCount > 0) {
        return ResponseHelper.error(res, 'Cannot delete subcategory with existing products', 400);
      }

      await subcategory.update({ is_active: false });

      return ResponseHelper.success(res, null, 'Subcategory removed successfully');
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      return ResponseHelper.error(res, 'Failed to remove subcategory', 500);
    }
  }

  // GET /subcategories/search - Search subcategories across branches
  static async searchSubcategories(req, res) {
    try {
      const {
        search,
        category_id,
        branch_id,
        has_offer,
        free_delivery,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { is_active: true };

      // Search by name
      if (search) {
        whereClause.name = { [Op.iLike]: `%${search}%` };
      }

      // Filter by category
      if (category_id) {
        whereClause.category_id = category_id;
      }

      // Filter by branch
      if (branch_id) {
        whereClause.branch_id = branch_id;
      }

      // Apply filters
      if (has_offer !== undefined) {
        whereClause.has_offer = has_offer === 'true';
      }

      if (free_delivery !== undefined) {
        whereClause.free_delivery = free_delivery === 'true';
      }

      const { count, rows: subcategories } = await Subcategory.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'image']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city', 'address']
          }
        ],
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Add product count for each subcategory
      const subcategoriesWithDetails = await Promise.all(
        subcategories.map(async (subcategory) => {
          const productCount = await subcategory.getProductCount();
          return {
            ...subcategory.toJSON(),
            product_count: productCount
          };
        })
      );

      return ResponseHelper.list(res, subcategoriesWithDetails, count, 'Subcategories retrieved successfully');
    } catch (error) {
      console.error('Error searching subcategories:', error);
      return ResponseHelper.error(res, 'Failed to search subcategories', 500);
    }
  }
}

module.exports = SubcategoryController;
