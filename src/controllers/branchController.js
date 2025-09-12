const { Branch, Vendor, Subcategory, Product, Review, Offer } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class BranchController {
  // GET /branches - List all branches with filters
  static async getAllBranches(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        city,
        free_delivery,
        has_offer,
        min_rating,
        category_id,
        vendor_id,
        lat,
        lng,
        radius = 10,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { is_active: true };

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { address: { [Op.iLike]: `%${search}%` } },
          { city: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // City filter
      if (city) {
        whereClause.city = { [Op.iLike]: `%${city}%` };
      }

      // Free delivery filter
      if (free_delivery !== undefined) {
        whereClause.free_delivery = free_delivery === 'true';
      }

      // Vendor filter
      if (vendor_id) {
        whereClause.vendor_id = vendor_id;
      }

      // Location-based search
      if (lat && lng) {
        const latFloat = parseFloat(lat);
        const lngFloat = parseFloat(lng);
        const radiusFloat = parseFloat(radius);

        // Simple bounding box calculation for performance
        const latRange = radiusFloat / 111; // Approximate km per degree latitude
        const lngRange = radiusFloat / (111 * Math.cos(latFloat * Math.PI / 180));

        whereClause.lat = {
          [Op.between]: [latFloat - latRange, latFloat + latRange]
        };
        whereClause.lng = {
          [Op.between]: [lngFloat - lngRange, lngFloat + lngRange]
        };
      }

      const orderClause = [[sort_by, sort_order.toUpperCase()]];

      const { count, rows: branches } = await Branch.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'name', 'image', 'about']
          },
          {
            model: Subcategory,
            as: 'subcategories',
            where: category_id ? { category_id } : undefined,
            required: !!category_id,
            attributes: ['id', 'name', 'image', 'has_offer', 'free_delivery']
          }
        ],
        order: orderClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      // Calculate ratings and apply filters
      const branchesWithRatings = await Promise.all(
        branches.map(async (branch) => {
          const rating = await branch.getAverageRating();
          
          // Apply rating filter
          if (min_rating && rating.averageRating < parseFloat(min_rating)) {
            return null;
          }

          // Apply offer filter
          if (has_offer === 'true') {
            const hasActiveOffer = await Offer.findOne({
              where: {
                entity_type: 'branch',
                entity_id: branch.id,
                is_active: true,
                start_date: { [Op.lte]: new Date() },
                end_date: { [Op.gte]: new Date() }
              }
            });
            if (!hasActiveOffer) return null;
          }

          return {
            ...branch.toJSON(),
            rating: rating.averageRating,
            total_reviews: rating.totalReviews,
            is_open: branch.isOpen()
          };
        })
      );

      const filteredBranches = branchesWithRatings.filter(branch => branch !== null);

      return ResponseHelper.list(res, filteredBranches, count, 'Branches retrieved successfully');
    } catch (error) {
      console.error('Error getting branches:', error);
      return ResponseHelper.error(res, 'Failed to retrieve branches', 500);
    }
  }

  // GET /branches/nearby - Find branches near a location
  static async getNearbyBranches(req, res) {
    try {
      const { lat, lng, radius = 10, limit = 20 } = req.query;

      if (!lat || !lng) {
        return ResponseHelper.error(res, 'Latitude and longitude are required', 400);
      }

      const latFloat = parseFloat(lat);
      const lngFloat = parseFloat(lng);
      const radiusFloat = parseFloat(radius);

      // Calculate distance for each branch
      const branches = await Branch.findAll({
        where: { is_active: true },
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'name', 'image']
          }
        ]
      });

      const branchesWithDistance = await Promise.all(
        branches.map(async (branch) => {
          const distance = BranchController.calculateDistance(
            latFloat, lngFloat, branch.lat, branch.lng
          );

          if (distance <= radiusFloat) {
            const rating = await branch.getAverageRating();
            return {
              ...branch.toJSON(),
              distance: Math.round(distance * 100) / 100,
              rating: rating.averageRating,
              total_reviews: rating.totalReviews,
              is_open: branch.isOpen()
            };
          }
          return null;
        })
      );

      const nearbyBranches = branchesWithDistance
        .filter(branch => branch !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, parseInt(limit));

      return ResponseHelper.list(res, nearbyBranches, nearbyBranches.length, 'Nearby branches retrieved successfully');
    } catch (error) {
      console.error('Error getting nearby branches:', error);
      return ResponseHelper.error(res, 'Failed to retrieve nearby branches', 500);
    }
  }

  // GET /branches/popular - Get popular branches
  static async getPopularBranches(req, res) {
    try {
      const { limit = 20 } = req.query;

      const branches = await Branch.findAll({
        where: { is_active: true },
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'name', 'image']
          },
          {
            model: Review,
            as: 'reviews',
            attributes: ['rating']
          }
        ],
        limit: parseInt(limit)
      });

      const branchesWithRatings = await Promise.all(
        branches.map(async (branch) => {
          const rating = await branch.getAverageRating();
          return {
            ...branch.toJSON(),
            rating: rating.averageRating,
            total_reviews: rating.totalReviews,
            is_open: branch.isOpen()
          };
        })
      );

      // Sort by rating and review count
      const popularBranches = branchesWithRatings
        .sort((a, b) => {
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.total_reviews - a.total_reviews;
        });

      return ResponseHelper.list(res, popularBranches, popularBranches.length, 'Popular branches retrieved successfully');
    } catch (error) {
      console.error('Error getting popular branches:', error);
      return ResponseHelper.error(res, 'Failed to retrieve popular branches', 500);
    }
  }

  // GET /branches/:id - Get branch details
  static async getBranchById(req, res) {
    try {
      const { id } = req.params;

      const branch = await Branch.findOne({
        where: { id, is_active: true },
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'name', 'image', 'about']
          },
          {
            model: Subcategory,
            as: 'subcategories',
            where: { is_active: true },
            required: false,
            attributes: ['id', 'name', 'image', 'has_offer', 'free_delivery', 'sort_order']
          },
          {
            model: Review,
            as: 'reviews',
            attributes: ['id', 'rating', 'comment', 'created_at'],
            limit: 10,
            order: [['created_at', 'DESC']]
          }
        ]
      });

      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      const rating = await branch.getAverageRating();
      const branchData = {
        ...branch.toJSON(),
        rating: rating.averageRating,
        total_reviews: rating.totalReviews,
        is_open: branch.isOpen()
      };

      return ResponseHelper.item(res, branchData, 'Branch details retrieved successfully');
    } catch (error) {
      console.error('Error getting branch:', error);
      return ResponseHelper.error(res, 'Failed to retrieve branch details', 500);
    }
  }

  // GET /vendors/:vendor_id/branches - Get branches for a vendor
  static async getVendorBranches(req, res) {
    try {
      const { vendor_id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;

      const { count, rows: branches } = await Branch.findAndCountAll({
        where: { vendor_id, is_active: true },
        include: [
          {
            model: Subcategory,
            as: 'subcategories',
            where: { is_active: true },
            required: false,
            attributes: ['id', 'name', 'image']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const branchesWithRatings = await Promise.all(
        branches.map(async (branch) => {
          const rating = await branch.getAverageRating();
          return {
            ...branch.toJSON(),
            rating: rating.averageRating,
            total_reviews: rating.totalReviews,
            is_open: branch.isOpen()
          };
        })
      );

      return ResponseHelper.list(res, branchesWithRatings, count, 'Vendor branches retrieved successfully');
    } catch (error) {
      console.error('Error getting vendor branches:', error);
      return ResponseHelper.error(res, 'Failed to retrieve vendor branches', 500);
    }
  }

  // POST /vendors/:vendor_id/branches - Create new branch
  static async createBranch(req, res) {
    try {
      const { vendor_id } = req.params;
      const branchData = req.body;

      // Verify vendor exists
      const vendor = await Vendor.findByPk(vendor_id);
      if (!vendor) {
        return ResponseHelper.error(res, 'Vendor not found', 404);
      }

      const branch = await Branch.create({
        ...branchData,
        vendor_id
      });

      const createdBranch = await Branch.findByPk(branch.id, {
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'name', 'image']
          }
        ]
      });

      return ResponseHelper.item(res, createdBranch, 'Branch created successfully', 201);
    } catch (error) {
      console.error('Error creating branch:', error);
      return ResponseHelper.error(res, 'Failed to create branch', 500);
    }
  }

  // PUT /branches/:id - Update branch
  static async updateBranch(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const branch = await Branch.findByPk(id);
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      await branch.update(updateData);

      const updatedBranch = await Branch.findByPk(id, {
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'name', 'image']
          }
        ]
      });

      return ResponseHelper.item(res, updatedBranch, 'Branch updated successfully');
    } catch (error) {
      console.error('Error updating branch:', error);
      return ResponseHelper.error(res, 'Failed to update branch', 500);
    }
  }

  // DELETE /branches/:id - Deactivate branch
  static async deleteBranch(req, res) {
    try {
      const { id } = req.params;

      const branch = await Branch.findByPk(id);
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      await branch.update({ is_active: false });

      return ResponseHelper.success(res, null, 'Branch deactivated successfully');
    } catch (error) {
      console.error('Error deleting branch:', error);
      return ResponseHelper.error(res, 'Failed to deactivate branch', 500);
    }
  }

  // POST /branches/:id/activate - Reactivate branch
  static async activateBranch(req, res) {
    try {
      const { id } = req.params;

      const branch = await Branch.findByPk(id);
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      await branch.update({ is_active: true });

      return ResponseHelper.success(res, null, 'Branch activated successfully');
    } catch (error) {
      console.error('Error activating branch:', error);
      return ResponseHelper.error(res, 'Failed to activate branch', 500);
    }
  }

  // Helper method to calculate distance between two points
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }
}

module.exports = BranchController;
