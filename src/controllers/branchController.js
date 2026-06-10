const { Branch, Vendor, Offer } = require('../models');
const ResponseHelper = require('../utils/responseHelper');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

// A platform admin may manage any restaurant; a restaurant owner only their own.
function canManageVendor(user, vendor) {
  if (!user || !vendor) return false;
  if (ADMIN_TYPES.includes(user.account_type)) return true;
  return !!vendor.owner_user_id && vendor.owner_user_id === user.user_id;
}

// Fields a branch owner may set/update. Excludes vendor_id so a branch can never
// be reassigned to another restaurant through the update route. Delivery pricing
// is intentionally NOT here — see ADMIN_ONLY_BRANCH_FIELDS.
const BRANCH_EDITABLE = ['name', 'image', 'address', 'city', 'lat', 'lng', 'delivery_time', 'min_order'];

// Delivery pricing is set by the platform/company, never by the merchant, so only
// a platform admin/owner may set these. A restaurant owner can't price their own
// delivery — the field falls back to the Branch default for merchant-created branches.
const ADMIN_ONLY_BRANCH_FIELDS = ['delivery_fee', 'free_delivery'];

const isAdmin = (user) => !!user && ADMIN_TYPES.includes(user.account_type);

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
      const query = { is_active: true };

      // Search filter
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ name: regex }, { address: regex }, { city: regex }];
      }

      // City filter
      if (city) {
        query.city = { $regex: escapeRegex(city), $options: 'i' };
      }

      // Free delivery filter
      if (free_delivery !== undefined) {
        query.free_delivery = free_delivery === 'true';
      }

      // Vendor filter
      if (vendor_id) {
        query.vendor_id = vendor_id;
      }

      // Location-based search (simple bounding box for performance)
      if (lat && lng) {
        const latFloat = parseFloat(lat);
        const lngFloat = parseFloat(lng);
        const radiusFloat = parseFloat(radius);

        const latRange = radiusFloat / 111; // Approximate km per degree latitude
        const lngRange = radiusFloat / (111 * Math.cos(latFloat * Math.PI / 180));

        query.lat = { $gte: latFloat - latRange, $lte: latFloat + latRange };
        query.lng = { $gte: lngFloat - lngRange, $lte: lngFloat + lngRange };
      }

      const sort = { [sort_by]: sort_order.toUpperCase() === 'ASC' ? 1 : -1 };

      const [branches, count] = await Promise.all([
        Branch.find(query)
          .populate({ path: 'vendor', select: 'id name image about is_featured cuisines' })
          .populate({
            path: 'subcategories',
            match: category_id ? { category_id } : {},
            select: 'id name image has_offer free_delivery'
          })
          .sort(sort)
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Branch.countDocuments(query)
      ]);

      // Calculate ratings and apply filters
      const branchesWithRatings = await Promise.all(
        branches.map(async (branch) => {
          // When filtering by category, only keep branches that have a matching subcategory
          if (category_id && (!branch.subcategories || branch.subcategories.length === 0)) {
            return null;
          }

          const rating = await branch.getAverageRating();

          // Apply rating filter
          if (min_rating && rating.averageRating < parseFloat(min_rating)) {
            return null;
          }

          // Apply offer filter
          if (has_offer === 'true') {
            const now = new Date();
            const hasActiveOffer = await Offer.findOne({
              entity_type: 'branch',
              entity_id: branch.id,
              is_active: true,
              start_date: { $lte: now },
              end_date: { $gte: now }
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

      const filteredBranches = branchesWithRatings.filter((branch) => branch !== null);

      // Surface branches of admin-featured restaurants first, preserving the
      // existing DB order otherwise (stable). Lets the customer home show
      // featured restaurants at the top without an extra cross-collection sort.
      filteredBranches.sort((a, b) => (b.vendor?.is_featured ? 1 : 0) - (a.vendor?.is_featured ? 1 : 0));

      return ResponseHelper.list(res, filteredBranches, count, 'Branches retrieved successfully');
    } catch (error) {
      console.error('Error getting branches:', error);
      return ResponseHelper.error(res, 'Failed to retrieve branches', 500);
    }
  }

  // GET /branches/nearby - Find branches near a location
  static async getNearbyBranches(req, res) {
    try {
      const { lat, lng, latitude, longitude, radius = 10, limit = 20 } = req.query;

      const finalLat = lat || latitude;
      const finalLng = lng || longitude;

      if (!finalLat || !finalLng) {
        return ResponseHelper.error(res, 'Latitude and longitude are required', 400);
      }

      const latFloat = parseFloat(finalLat);
      const lngFloat = parseFloat(finalLng);
      const radiusFloat = parseFloat(radius);

      // Calculate distance for each branch
      const branches = await Branch.find({ is_active: true })
        .populate({ path: 'vendor', select: 'id name image cuisines' });

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
        .filter((branch) => branch !== null)
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

      const branches = await Branch.find({ is_active: true })
        .populate({ path: 'vendor', select: 'id name image cuisines' })
        .populate({ path: 'reviews', select: 'rating' })
        .limit(parseInt(limit));

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

      const branch = await Branch.findOne({ id, is_active: true })
        .populate({ path: 'vendor', select: 'id name image about cuisines' })
        .populate({
          path: 'subcategories',
          match: { is_active: true },
          select: 'id name image has_offer free_delivery sort_order'
        })
        .populate({
          path: 'reviews',
          select: 'id rating comment created_at',
          options: { sort: { created_at: -1 }, limit: 10 }
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
      const query = { vendor_id, is_active: true };

      const [branches, count] = await Promise.all([
        Branch.find(query)
          .populate({
            path: 'subcategories',
            match: { is_active: true },
            select: 'id name image'
          })
          .sort({ created_at: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Branch.countDocuments(query)
      ]);

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
      const vendor = await Vendor.findOne({ id: vendor_id });
      if (!vendor) {
        return ResponseHelper.error(res, 'Vendor not found', 404);
      }

      // Only the restaurant's own owner (or an admin) may add a branch to it.
      if (!canManageVendor(req.user, vendor)) {
        return ResponseHelper.error(res, 'You are not allowed to add a branch to this restaurant', 403);
      }

      // Whitelist the fields a client may set; never trust vendor_id from the body.
      const payload = { vendor_id };
      for (const key of BRANCH_EDITABLE) {
        if (branchData[key] !== undefined) payload[key] = branchData[key];
      }
      // Delivery pricing is company-controlled — only honour it from a platform admin.
      if (isAdmin(req.user)) {
        for (const key of ADMIN_ONLY_BRANCH_FIELDS) {
          if (branchData[key] !== undefined) payload[key] = branchData[key];
        }
      }

      const branch = await Branch.create(payload);

      const createdBranch = await Branch.findOne({ id: branch.id })
        .populate({ path: 'vendor', select: 'id name image cuisines' });

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

      const branch = await Branch.findOne({ id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Only the owning restaurant (or an admin) may edit this branch.
      const vendor = await Vendor.findOne({ id: branch.vendor_id });
      if (!canManageVendor(req.user, vendor)) {
        return ResponseHelper.error(res, 'You are not allowed to edit this branch', 403);
      }

      // Apply only whitelisted fields — never req.body wholesale (would let a
      // client move the branch to another vendor or toggle internal flags).
      const updateData = {};
      for (const key of BRANCH_EDITABLE) {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      }
      // Delivery pricing is company-controlled — only a platform admin may change it.
      if (isAdmin(req.user)) {
        for (const key of ADMIN_ONLY_BRANCH_FIELDS) {
          if (req.body[key] !== undefined) updateData[key] = req.body[key];
        }
      }
      await branch.update(updateData);

      const updatedBranch = await Branch.findOne({ id })
        .populate({ path: 'vendor', select: 'id name image cuisines' });

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

      const branch = await Branch.findOne({ id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Only the owning restaurant (or an admin) may remove this branch.
      const vendor = await Vendor.findOne({ id: branch.vendor_id });
      if (!canManageVendor(req.user, vendor)) {
        return ResponseHelper.error(res, 'You are not allowed to delete this branch', 403);
      }

      await branch.update({ is_active: false });

      return ResponseHelper.success(res, null, 'Branch deactivated successfully');
    } catch (error) {
      console.error('Error deleting branch:', error);
      return ResponseHelper.error(res, 'Failed to deactivate branch', 500);
    }
  }

  // PATCH /branches/:id/availability - Restaurant toggles "busy / not accepting
  // orders" on its own branch (Keeta-style pause). Owner or admin only.
  // Body: { is_accepting_orders: boolean }. The branch stays listed; checkout
  // is what rejects new orders while paused.
  static async setBranchAvailability(req, res) {
    try {
      const { id } = req.params;
      const { is_accepting_orders } = req.body;

      if (typeof is_accepting_orders !== 'boolean') {
        return ResponseHelper.error(res, 'is_accepting_orders must be a boolean', 400);
      }

      const branch = await Branch.findOne({ id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Only the owning restaurant (or an admin) may pause/resume this branch.
      const vendor = await Vendor.findOne({ id: branch.vendor_id });
      if (!canManageVendor(req.user, vendor)) {
        return ResponseHelper.error(res, 'You are not allowed to manage this branch', 403);
      }

      await branch.update({ is_accepting_orders });

      const updatedBranch = await Branch.findOne({ id });
      return ResponseHelper.item(
        res,
        updatedBranch,
        is_accepting_orders ? 'Branch is now accepting orders' : 'Branch is now paused (busy)'
      );
    } catch (error) {
      console.error('Error updating branch availability:', error);
      return ResponseHelper.error(res, 'Failed to update branch availability', 500);
    }
  }

  // POST /branches/:id/activate - Reactivate branch
  static async activateBranch(req, res) {
    try {
      const { id } = req.params;

      const branch = await Branch.findOne({ id });
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
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }
}

module.exports = BranchController;
