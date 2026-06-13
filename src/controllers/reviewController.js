const { Review, Branch, Vendor, User, Order } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const notificationService = require('../services/notificationService');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

// Branch ids belonging to every restaurant owned by the given user (merchant).
async function ownedBranchIds(userId) {
  const vendors = await Vendor.find({ owner_user_id: userId }).select('id').lean();
  if (vendors.length === 0) return [];
  const vendorIds = vendors.map((v) => v.id);
  const branches = await Branch.find({ vendor_id: { $in: vendorIds } }).select('id').lean();
  return branches.map((b) => b.id);
}

class ReviewController {
  // GET /branches/:id/reviews - Get reviews for a branch
  static async getBranchReviews(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { page = 1, limit = 20, rating, sort_by = 'created_at', sort_order = 'DESC' } = req.query;

      const offset = (page - 1) * limit;
      const query = { branch_id };

      // Filter by rating
      if (rating) {
        query.rating = parseInt(rating);
      }

      const sort = { [sort_by]: sort_order.toUpperCase() === 'ASC' ? 1 : -1 };

      const [reviews, count] = await Promise.all([
        Review.find(query)
          .populate({ path: 'branch', select: 'id name city' })
          .sort(sort)
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Review.countDocuments(query)
      ]);

      return ResponseHelper.list(res, reviews, count, 'Branch reviews retrieved successfully');
    } catch (error) {
      console.error('Error getting branch reviews:', error);
      return ResponseHelper.error(res, 'Failed to retrieve branch reviews', 500);
    }
  }

  // POST /branches/:id/reviews - Add review for a branch.
  // The reviewer is the authenticated user (never trusted from the body), and a
  // review is only allowed after the user has actually had an order delivered
  // from this branch — so reviews reflect real experiences, not drive-bys.
  static async createReview(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { rating, comment } = req.body;
      const user_id = req.user.user_id;

      // Verify branch exists
      const branch = await Branch.findOne({ id: branch_id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return ResponseHelper.error(res, 'Rating must be between 1 and 5', 400);
      }

      // Purchase gate: require at least one delivered order from this branch.
      const deliveredOrder = await Order.findOne({
        user_id,
        branch_id,
        status: 'delivered'
      }).select('order_id').lean();
      if (!deliveredOrder) {
        return ResponseHelper.error(
          res,
          'You can only review a restaurant after an order has been delivered',
          403
        );
      }

      // One review per user per branch (also enforced by a unique index).
      const existingReview = await Review.findOne({ branch_id, user_id });
      if (existingReview) {
        return ResponseHelper.error(res, 'You have already reviewed this branch', 400);
      }

      const review = await Review.create({
        branch_id,
        user_id,
        rating,
        comment: comment != null ? String(comment).trim() : null
      });

      // Tell the restaurant owner + admins about the new review (good or bad).
      // Fire-and-forget so a notification hiccup never fails the review.
      const vendor = await Vendor.findOne({ id: branch.vendor_id })
        .select('id name owner_user_id')
        .lean();
      notificationService
        .notifyReviewCreated({ review, branch, vendor })
        .catch((e) => console.error('review notify error:', e.message));

      const createdReview = await Review.findOne({ id: review.id })
        .populate({ path: 'branch', select: 'id name city' });

      return ResponseHelper.item(res, createdReview, 'Review added successfully', 201);
    } catch (error) {
      console.error('Error creating review:', error);
      return ResponseHelper.error(res, 'Failed to add review', 500);
    }
  }

  // GET /reviews/incoming - Reviews for the merchant's own restaurant(s), or
  // ALL reviews for an admin. Mirrors orders' /incoming so the web dashboards
  // can show (and poll for) reviews. Each row carries the reviewer's name and
  // the branch/restaurant name for display.
  static async getIncomingReviews(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 30, 100);
      const ratingFilter = req.query.rating ? parseInt(req.query.rating) : null;
      const isAdmin = ADMIN_TYPES.includes(req.user.account_type);

      const query = {};
      if (!isAdmin) {
        const branchIds = await ownedBranchIds(req.user.user_id);
        if (branchIds.length === 0) {
          return ResponseHelper.success(
            res,
            { reviews: [], stats: { total_reviews: 0, average_rating: 0 } },
            'No reviews yet'
          );
        }
        query.branch_id = { $in: branchIds };
      }
      if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
        query.rating = ratingFilter;
      }

      const baseQuery = query.branch_id ? { branch_id: query.branch_id } : {};
      const offset = (page - 1) * limit;
      const [rows, count, agg] = await Promise.all([
        Review.find(query).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
        Review.countDocuments(query),
        Review.aggregate([
          { $match: baseQuery },
          { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } }
        ])
      ]);

      // Resolve reviewer names + branch/restaurant names in batched queries.
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const branchIds = [...new Set(rows.map((r) => r.branch_id).filter(Boolean))];
      const [users, branches] = await Promise.all([
        userIds.length
          ? User.find({ user_id: { $in: userIds } }).select('user_id full_name username').lean()
          : [],
        branchIds.length
          ? Branch.find({ id: { $in: branchIds } }).select('id name vendor_id').lean()
          : []
      ]);
      const vendorIds = [...new Set(branches.map((b) => b.vendor_id).filter(Boolean))];
      const vendors = vendorIds.length
        ? await Vendor.find({ id: { $in: vendorIds } }).select('id name').lean()
        : [];
      const userById = new Map(users.map((u) => [u.user_id, u]));
      const branchById = new Map(branches.map((b) => [b.id, b]));
      const vendorById = new Map(vendors.map((v) => [v.id, v]));

      const reviews = rows.map((r) => {
        const u = userById.get(r.user_id);
        const b = branchById.get(r.branch_id);
        const v = b ? vendorById.get(b.vendor_id) : null;
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment || null,
          created_at: r.created_at,
          customer_name: u ? (u.full_name || u.username) : null,
          branch_id: r.branch_id,
          branch_name: b ? b.name : null,
          vendor_name: v ? v.name : null
        };
      });

      return ResponseHelper.success(
        res,
        {
          reviews,
          stats: {
            total_reviews: agg[0] ? agg[0].total : 0,
            average_rating: agg[0] ? Math.round((agg[0].avg || 0) * 10) / 10 : 0
          },
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit
          }
        },
        'Reviews retrieved successfully'
      );
    } catch (error) {
      console.error('Error getting incoming reviews:', error);
      return ResponseHelper.error(res, 'Failed to retrieve reviews', 500);
    }
  }

  // PUT /reviews/:id - Update review
  static async updateReview(req, res) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;

      const review = await Review.findOne({ id });
      if (!review) {
        return ResponseHelper.error(res, 'Review not found', 404);
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        return ResponseHelper.error(res, 'Rating must be between 1 and 5', 400);
      }

      await review.update({ rating, comment });

      const updatedReview = await Review.findOne({ id })
        .populate({ path: 'branch', select: 'id name city' });

      return ResponseHelper.item(res, updatedReview, 'Review updated successfully');
    } catch (error) {
      console.error('Error updating review:', error);
      return ResponseHelper.error(res, 'Failed to update review', 500);
    }
  }

  // DELETE /reviews/:id - Delete review
  static async deleteReview(req, res) {
    try {
      const { id } = req.params;

      const review = await Review.findOne({ id });
      if (!review) {
        return ResponseHelper.error(res, 'Review not found', 404);
      }

      await review.destroy();

      return ResponseHelper.success(res, null, 'Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      return ResponseHelper.error(res, 'Failed to delete review', 500);
    }
  }

  // GET /reviews/user/:user_id - Get reviews by user
  static async getUserReviews(req, res) {
    try {
      const { user_id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;

      const [reviews, count] = await Promise.all([
        Review.find({ user_id })
          .populate({ path: 'branch', select: 'id name city address' })
          .sort({ created_at: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Review.countDocuments({ user_id })
      ]);

      return ResponseHelper.list(res, reviews, count, 'User reviews retrieved successfully');
    } catch (error) {
      console.error('Error getting user reviews:', error);
      return ResponseHelper.error(res, 'Failed to retrieve user reviews', 500);
    }
  }

  // GET /reviews/stats/:branch_id - Get review statistics for a branch
  static async getBranchReviewStats(req, res) {
    try {
      const { branch_id } = req.params;

      const [stats] = await Review.aggregate([
        { $match: { branch_id } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            minRating: { $min: '$rating' },
            maxRating: { $max: '$rating' }
          }
        }
      ]);

      // Get rating distribution
      const ratingDistribution = await Review.aggregate([
        { $match: { branch_id } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      const statsData = {
        average_rating: stats ? parseFloat(stats.averageRating) || 0 : 0,
        total_reviews: stats ? stats.totalReviews : 0,
        min_rating: stats ? stats.minRating : 0,
        max_rating: stats ? stats.maxRating : 0,
        rating_distribution: ratingDistribution.reduce((acc, item) => {
          acc[`rating_${item._id}`] = item.count;
          return acc;
        }, {})
      };

      return ResponseHelper.item(res, statsData, 'Review statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting review stats:', error);
      return ResponseHelper.error(res, 'Failed to retrieve review statistics', 500);
    }
  }
}

module.exports = ReviewController;
