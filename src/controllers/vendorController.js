const { Vendor, Branch, Review } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class VendorController {
  // GET /vendors - List all vendors with filters
  static async getAllVendors(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        is_active,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { about: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Active filter
      if (is_active !== undefined) {
        whereClause.is_active = is_active === 'true';
      }

      const orderClause = [[sort_by, sort_order.toUpperCase()]];

      const { count, rows: vendors } = await Vendor.findAndCountAll({
        where: whereClause,
        order: orderClause,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Add branch count and average rating for each vendor
      const vendorsWithDetails = await Promise.all(
        vendors.map(async (vendor) => {
          const branchCount = await vendor.getActiveBranchesCount();
          const rating = await vendor.getAverageRating();

          return {
            ...vendor.toJSON(),
            branch_count: branchCount,
            average_rating: rating.averageRating,
            total_reviews: rating.totalReviews,
            is_subscription_active: vendor.isSubscriptionActive()
          };
        })
      );

      return ResponseHelper.list(res, vendorsWithDetails, count, 'Vendors retrieved successfully');
    } catch (error) {
      console.error('Error getting vendors:', error);
      return ResponseHelper.error(res, 'Failed to retrieve vendors', 500);
    }
  }

  // GET /vendors/:id - Get vendor details with branches
  static async getVendorById(req, res) {
    try {
      const { id } = req.params;

      const vendor = await Vendor.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branches',
            where: { is_active: true },
            required: false,
            attributes: ['id', 'name', 'city', 'address', 'lat', 'lng', 'delivery_time', 'min_order', 'delivery_fee', 'free_delivery']
          }
        ]
      });

      if (!vendor) {
        return ResponseHelper.error(res, 'Vendor not found', 404);
      }

      const branchCount = await vendor.getActiveBranchesCount();
      const rating = await vendor.getAverageRating();

      const vendorData = {
        ...vendor.toJSON(),
        branch_count: branchCount,
        average_rating: rating.averageRating,
        total_reviews: rating.totalReviews,
        is_subscription_active: vendor.isSubscriptionActive()
      };

      return ResponseHelper.item(res, vendorData, 'Vendor details retrieved successfully');
    } catch (error) {
      console.error('Error getting vendor:', error);
      return ResponseHelper.error(res, 'Failed to retrieve vendor details', 500);
    }
  }

  // POST /vendors - Create new vendor
  static async createVendor(req, res) {
    try {
      const vendorData = req.body;

      const vendor = await Vendor.create(vendorData);

      return ResponseHelper.item(res, vendor, 'Vendor created successfully', 201);
    } catch (error) {
      console.error('Error creating vendor:', error);
      return ResponseHelper.error(res, 'Failed to create vendor', 500);
    }
  }

  // PUT /vendors/:id - Update vendor
  static async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return ResponseHelper.error(res, 'Vendor not found', 404);
      }

      await vendor.update(updateData);

      return ResponseHelper.item(res, vendor, 'Vendor updated successfully');
    } catch (error) {
      console.error('Error updating vendor:', error);
      return ResponseHelper.error(res, 'Failed to update vendor', 500);
    }
  }

  // DELETE /vendors/:id - Deactivate vendor
  static async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return ResponseHelper.error(res, 'Vendor not found', 404);
      }

      await vendor.update({ is_active: false });

      return ResponseHelper.success(res, null, 'Vendor deactivated successfully');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      return ResponseHelper.error(res, 'Failed to deactivate vendor', 500);
    }
  }

  // GET /vendors/popular - Get popular vendors
  static async getPopularVendors(req, res) {
    try {
      const { limit = 20 } = req.query;

      const vendors = await Vendor.findAll({
        where: { is_active: true },
        limit: parseInt(limit)
      });

      const vendorsWithRatings = await Promise.all(
        vendors.map(async (vendor) => {
          const branchCount = await vendor.getActiveBranchesCount();
          const rating = await vendor.getAverageRating();

          return {
            ...vendor.toJSON(),
            branch_count: branchCount,
            average_rating: rating.averageRating,
            total_reviews: rating.totalReviews,
            is_subscription_active: vendor.isSubscriptionActive()
          };
        })
      );

      // Sort by rating and review count
      const popularVendors = vendorsWithRatings
        .sort((a, b) => {
          if (b.average_rating !== a.average_rating) {
            return b.average_rating - a.average_rating;
          }
          return b.total_reviews - a.total_reviews;
        });

      return ResponseHelper.list(res, popularVendors, popularVendors.length, 'Popular vendors retrieved successfully');
    } catch (error) {
      console.error('Error getting popular vendors:', error);
      return ResponseHelper.error(res, 'Failed to retrieve popular vendors', 500);
    }
  }

  // GET /vendors/expired-subscriptions - Get vendors with expired subscriptions
  static async getExpiredSubscriptions(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;

      const vendors = await Vendor.findAll({
        where: { is_active: true },
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const expiredVendors = vendors.filter(vendor => !vendor.isSubscriptionActive());

      return ResponseHelper.list(res, expiredVendors, expiredVendors.length, 'Expired subscription vendors retrieved successfully');
    } catch (error) {
      console.error('Error getting expired subscriptions:', error);
      return ResponseHelper.error(res, 'Failed to retrieve expired subscription vendors', 500);
    }
  }
}

module.exports = VendorController;