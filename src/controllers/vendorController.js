const { Vendor, Branch } = require('../models');
const ResponseHelper = require('../utils/responseHelper');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      const query = {};

      // Search filter
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ name: regex }, { about: regex }];
      }

      // Active filter
      if (is_active !== undefined) {
        query.is_active = is_active === 'true';
      }

      const sort = { [sort_by]: sort_order.toUpperCase() === 'ASC' ? 1 : -1 };

      const [vendors, count] = await Promise.all([
        Vendor.find(query).sort(sort).skip(parseInt(offset)).limit(parseInt(limit)),
        Vendor.countDocuments(query)
      ]);

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

      const vendor = await Vendor.findOne({ id }).populate({
        path: 'branches',
        match: { is_active: true },
        select: 'id name city address lat lng delivery_time min_order delivery_fee free_delivery'
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

  // POST /vendors - Create new vendor (owned by the authenticated user)
  static async createVendor(req, res) {
    try {
      const vendorData = { ...req.body };

      // Bind the new restaurant to the account that created it so the web
      // portal can resolve "my restaurant" later. Clients cannot spoof this.
      if (req.user && req.user.user_id) {
        vendorData.owner_user_id = req.user.user_id;
      }

      const vendor = await Vendor.create(vendorData);

      return ResponseHelper.item(res, vendor, 'Vendor created successfully', 201);
    } catch (error) {
      console.error('Error creating vendor:', error);
      return ResponseHelper.error(res, 'Failed to create vendor', 500);
    }
  }

  // GET /vendors/mine - Restaurant(s) owned by the authenticated user
  static async getMyVendors(req, res) {
    try {
      const vendors = await Vendor.find({ owner_user_id: req.user.user_id }).sort({ created_at: -1 });

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

      return ResponseHelper.list(res, vendorsWithDetails, vendorsWithDetails.length, 'My restaurants retrieved successfully');
    } catch (error) {
      console.error('Error getting my vendors:', error);
      return ResponseHelper.error(res, 'Failed to retrieve restaurants', 500);
    }
  }

  // PATCH /vendors/:id/block - Admin: block (deactivate) a restaurant
  static async blockVendor(req, res) {
    return VendorController.setVendorActive(req, res, false, 'Restaurant blocked successfully');
  }

  // PATCH /vendors/:id/unblock - Admin: unblock (reactivate) a restaurant
  static async unblockVendor(req, res) {
    return VendorController.setVendorActive(req, res, true, 'Restaurant unblocked successfully');
  }

  static async setVendorActive(req, res, isActive, message) {
    try {
      const { id } = req.params;
      const vendor = await Vendor.findOne({ id });
      if (!vendor) {
        return ResponseHelper.error(res, 'Vendor not found', 404);
      }
      await vendor.update({ is_active: isActive });
      return ResponseHelper.item(res, vendor, message);
    } catch (error) {
      console.error('Error changing vendor active state:', error);
      return ResponseHelper.error(res, 'Failed to update restaurant status', 500);
    }
  }

  // PUT /vendors/:id - Update vendor
  static async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const vendor = await Vendor.findOne({ id });
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

      const vendor = await Vendor.findOne({ id });
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

      const vendors = await Vendor.find({ is_active: true }).limit(parseInt(limit));

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

      const vendors = await Vendor.find({ is_active: true })
        .skip(parseInt(offset))
        .limit(parseInt(limit));

      const expiredVendors = vendors.filter((vendor) => !vendor.isSubscriptionActive());

      return ResponseHelper.list(res, expiredVendors, expiredVendors.length, 'Expired subscription vendors retrieved successfully');
    } catch (error) {
      console.error('Error getting expired subscriptions:', error);
      return ResponseHelper.error(res, 'Failed to retrieve expired subscription vendors', 500);
    }
  }
}

module.exports = VendorController;
