const Category = require('../models/Category');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class CategoryController {
  // Get all categories with pagination and search
  async getAllCategories(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      if (search) {
        whereClause.name = {
          [Op.iLike]: `%${search}%`
        };
      }

      const { count, rows: categories } = await Category.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      const totalPages = Math.ceil(count / limit);

      res.json(
        ResponseHelper.success({
          categories,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }, 'Categories retrieved successfully', count)
      );
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to retrieve categories', error.message, 0)
      );
    }
  }

  // Get category by ID
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json(
          ResponseHelper.error('Category not found', null, 0)
        );
      }

      res.json(
        ResponseHelper.success({
          category
        }, 'Category retrieved successfully', 1)
      );
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to retrieve category', error.message, 0)
      );
    }
  }

  // Create new category
  async createCategory(req, res) {
    try {
      const { name, image, has_offer, free_delivery } = req.body;

      // Check if category with same name already exists
      const existingCategory = await Category.findOne({
        where: { name: { [Op.iLike]: name } }
      });

      if (existingCategory) {
        return res.status(400).json(
          ResponseHelper.error('Category with this name already exists', null, 0)
        );
      }

      const category = await Category.create({
        name,
        image,
        has_offer: has_offer ? parseFloat(has_offer) : null,
        free_delivery: free_delivery || false
      });

      res.status(201).json(
        ResponseHelper.success({
          category
        }, 'Category created successfully', 1)
      );
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to create category', error.message, 0)
      );
    }
  }

  // Update category
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, image, has_offer, free_delivery } = req.body;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json(
          ResponseHelper.error('Category not found', null, 0)
        );
      }

      // Check if name is being updated and if it conflicts with existing category
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          where: { 
            name: { [Op.iLike]: name },
            id: { [Op.ne]: id }
          }
        });

        if (existingCategory) {
          return res.status(400).json(
            ResponseHelper.error('Category with this name already exists', null, 0)
          );
        }
      }

      // Update only provided fields
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (image !== undefined) updateData.image = image;
      if (has_offer !== undefined) updateData.has_offer = has_offer ? parseFloat(has_offer) : null;
      if (free_delivery !== undefined) updateData.free_delivery = free_delivery;

      await category.update(updateData);

      res.json(
        ResponseHelper.success({
          category
        }, 'Category updated successfully', 1)
      );
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to update category', error.message, 0)
      );
    }
  }

  // Delete category (soft delete)
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json(
          ResponseHelper.error('Category not found', null, 0)
        );
      }

      // For now, we'll do a hard delete
      // In a real application, you might want to implement soft delete
      await category.destroy();

      res.json(
        ResponseHelper.success(null, 'Category deleted successfully', 0)
      );
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to delete category', error.message, 0)
      );
    }
  }
}

module.exports = new CategoryController();
