const { Review, Branch } = require('../models');
const ResponseHelper = require('../utils/responseHelper');

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

  // POST /branches/:id/reviews - Add review for a branch
  static async createReview(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { user_id, rating, comment } = req.body;

      // Verify branch exists
      const branch = await Branch.findOne({ id: branch_id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Check if user already reviewed this branch
      const existingReview = await Review.findOne({ branch_id, user_id });

      if (existingReview) {
        return ResponseHelper.error(res, 'You have already reviewed this branch', 400);
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return ResponseHelper.error(res, 'Rating must be between 1 and 5', 400);
      }

      const review = await Review.create({
        branch_id,
        user_id,
        rating,
        comment
      });

      const createdReview = await Review.findOne({ id: review.id })
        .populate({ path: 'branch', select: 'id name city' });

      return ResponseHelper.item(res, createdReview, 'Review added successfully', 201);
    } catch (error) {
      console.error('Error creating review:', error);
      return ResponseHelper.error(res, 'Failed to add review', 500);
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
