const Vendor = require('../models/Vendor');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class VendorController {
  // GET /vendors - Get all vendors with filtering, search, and sorting
  static async getAllVendors(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category_id,
        sub_category_id,
        min_rating,
        location,
        free_delivery,
        has_offer,
        sort = 'id'
      } = req.query;

      // Parse location parameters
      let userLat, userLng, radiusKm;
      if (location) {
        const locationParams = location.split(',');
        if (locationParams.length >= 2) {
          userLat = parseFloat(locationParams[0]);
          userLng = parseFloat(locationParams[1]);
          radiusKm = locationParams[2] ? parseFloat(locationParams[2]) : 10; // Default 10km radius
        }
      }

      // Build where clause
      const whereClause = {
        is_active: true
      };

      // Search functionality
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { about: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Rating filter
      if (min_rating) {
        whereClause.rating = { [Op.gte]: parseFloat(min_rating) };
      }

      // Location-based filtering (simplified - in real app, use PostGIS)
      let vendors;
      if (userLat && userLng) {
        vendors = await Vendor.findAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: VendorController.getSortOrder(sort, userLat, userLng)
        });

        // Filter by distance
        if (radiusKm) {
          vendors = vendors.filter(vendor => {
            const distance = vendor.calculateDistance(userLat, userLng);
            return distance !== null && distance <= radiusKm;
          });
        }
      } else {
        vendors = await Vendor.findAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: VendorController.getSortOrder(sort)
        });
      }

      // Get total count
      const totalCount = await Vendor.count({ where: whereClause });

      // Format response
      const formattedVendors = vendors.map(vendor => {
        const vendorData = vendor.getPublicProfile();
        if (userLat && userLng) {
          vendorData.distance = vendor.calculateDistance(userLat, userLng);
        }
        return vendorData;
      });

      return res.json(ResponseHelper.list(formattedVendors, 'Vendors retrieved successfully', totalCount));
    } catch (error) {
      console.error('Get vendors error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to retrieve vendors'));
    }
  }

  // GET /vendors/{id} - Get vendor by ID
  static async getVendorById(req, res) {
    try {
      const { id } = req.params;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return res.status(404).json(ResponseHelper.error('Vendor not found'));
      }

      const vendorData = vendor.getPublicProfile();
      vendorData.subscription_active = vendor.isSubscriptionActive();

      return res.json(ResponseHelper.item(vendorData, 'Vendor retrieved successfully'));
    } catch (error) {
      console.error('Get vendor by ID error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to retrieve vendor'));
    }
  }

  // GET /vendors/popular - Get popular vendors
  static async getPopularVendors(req, res) {
    try {
      const { limit = 10 } = req.query;

      const vendors = await Vendor.findAll({
        where: {
          is_active: true,
          rating: { [Op.gte]: 4.0 } // Popular vendors have rating >= 4.0
        },
        order: [['rating', 'DESC'], ['created_at', 'DESC']],
        limit: parseInt(limit)
      });

      const formattedVendors = vendors.map(vendor => vendor.getPublicProfile());

      return res.json(ResponseHelper.list(formattedVendors, 'Popular vendors retrieved successfully'));
    } catch (error) {
      console.error('Get popular vendors error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to retrieve popular vendors'));
    }
  }

  // GET /vendors/nearby - Get vendors near location
  static async getNearbyVendors(req, res) {
    try {
      const { lat, lng, radius_km = 10 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json(ResponseHelper.error('Latitude and longitude are required'));
      }

      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radius = parseFloat(radius_km);

      const vendors = await Vendor.findAll({
        where: {
          is_active: true,
          location: {
            [Op.ne]: null
          }
        }
      });

      // Filter by distance
      const nearbyVendors = vendors
        .map(vendor => {
          const distance = vendor.calculateDistance(userLat, userLng);
          if (distance !== null && distance <= radius) {
            const vendorData = vendor.getPublicProfile();
            vendorData.distance = distance;
            return vendorData;
          }
          return null;
        })
        .filter(vendor => vendor !== null)
        .sort((a, b) => a.distance - b.distance);

      return res.json(ResponseHelper.list(nearbyVendors, 'Nearby vendors retrieved successfully'));
    } catch (error) {
      console.error('Get nearby vendors error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to retrieve nearby vendors'));
    }
  }

  // GET /vendors/expired-subscription - Get vendors with expired subscriptions (Admin only)
  static async getExpiredSubscriptionVendors(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const vendors = await Vendor.findAll({
        where: {
          is_active: true
        },
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['subscript_date', 'ASC']]
      });

      // Filter vendors with expired subscriptions
      const expiredVendors = vendors.filter(vendor => !vendor.isSubscriptionActive());

      const formattedVendors = expiredVendors.map(vendor => {
        const vendorData = vendor.getPublicProfile();
        vendorData.subscription_expired = true;
        vendorData.subscript_date = vendor.subscript_date;
        return vendorData;
      });

      return res.json(ResponseHelper.list(formattedVendors, 'Expired subscription vendors retrieved successfully'));
    } catch (error) {
      console.error('Get expired subscription vendors error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to retrieve expired subscription vendors'));
    }
  }

  // POST /vendors - Create new vendor (Admin only)
  static async createVendor(req, res) {
    try {
      const {
        name,
        image,
        about,
        work_time,
        location,
        subscript_date
      } = req.body;

      // Check if vendor name already exists
      const existingVendor = await Vendor.findOne({
        where: { name: { [Op.iLike]: name } }
      });

      if (existingVendor) {
        return res.status(409).json(ResponseHelper.error('Vendor name already exists'));
      }

      const vendor = await Vendor.create({
        name,
        image,
        about,
        work_time,
        location,
        subscript_date: subscript_date || new Date(),
        is_active: true,
        rating: 0.00
      });

      return res.status(201).json(ResponseHelper.item(vendor.getPublicProfile(), 'Vendor created successfully'));
    } catch (error) {
      console.error('Create vendor error:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json(ResponseHelper.error('Validation failed', error.errors));
      }
      return res.status(500).json(ResponseHelper.error('Failed to create vendor'));
    }
  }

  // PUT /vendors/{id} - Update vendor
  static async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return res.status(404).json(ResponseHelper.error('Vendor not found'));
      }

      // Check if name is being updated and if it already exists
      if (updateData.name && updateData.name !== vendor.name) {
        const existingVendor = await Vendor.findOne({
          where: {
            name: { [Op.iLike]: updateData.name },
            id: { [Op.ne]: id }
          }
        });

        if (existingVendor) {
          return res.status(409).json(ResponseHelper.error('Vendor name already exists'));
        }
      }

      await vendor.update(updateData);

      return res.json(ResponseHelper.item(vendor.getPublicProfile(), 'Vendor updated successfully'));
    } catch (error) {
      console.error('Update vendor error:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json(ResponseHelper.error('Validation failed', error.errors));
      }
      return res.status(500).json(ResponseHelper.error('Failed to update vendor'));
    }
  }

  // DELETE /vendors/{id} - Soft delete vendor (Admin only)
  static async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return res.status(404).json(ResponseHelper.error('Vendor not found'));
      }

      // Soft delete by setting is_active to false
      await vendor.update({ is_active: false });

      return res.json(ResponseHelper.success(null, 'Vendor deactivated successfully'));
    } catch (error) {
      console.error('Delete vendor error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to delete vendor'));
    }
  }

  // POST /vendors/{id}/block - Block vendor (Admin only)
  static async blockVendor(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return res.status(404).json(ResponseHelper.error('Vendor not found'));
      }

      await vendor.update({ 
        is_active: false,
        // In a real app, you might want to store the block reason in a separate table
      });

      return res.json(ResponseHelper.success(null, `Vendor blocked successfully${reason ? `: ${reason}` : ''}`));
    } catch (error) {
      console.error('Block vendor error:', error);
      return res.status(500).json(ResponseHelper.error('Failed to block vendor'));
    }
  }

  // Helper method to get sort order
  static getSortOrder(sort, userLat = null, userLng = null) {
    const sortOptions = {
      'rating': [['rating', 'DESC']],
      'rating (desc)': [['rating', 'DESC']],
      'delivery_fee': [['delivery_fee', 'ASC']],
      'min_order': [['min_order', 'ASC']],
      'delivery_time': [['delivery_time', 'ASC']],
      'distance': userLat && userLng ? [['location', 'ASC']] : [['created_at', 'DESC']],
      'offers_count': [['offers_count', 'DESC']],
      'id': [['created_at', 'DESC']],
      'id (creation order)': [['created_at', 'DESC']]
    };

    return sortOptions[sort] || sortOptions['id'];
  }
}

module.exports = VendorController;
