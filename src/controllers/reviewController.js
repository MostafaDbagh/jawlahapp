const { Review, Branch, User } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const { Op } = require('sequelize');

class ReviewController {
  // GET /branches/:id/reviews - Get reviews for a branch
  static async getBranchReviews(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { page = 1, limit = 20, rating, sort_by = 'created_at', sort_order = 'DESC' } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { branch_id };

      // Filter by rating
      if (rating) {
        whereClause.rating = parseInt(rating);
      }

      const orderClause = [[sort_by, sort_order.toUpperCase()]];

      const { count, rows: reviews } = await Review.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          }
        ],
        order: orderClause,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

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
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      // Check if user already reviewed this branch
      const existingReview = await Review.findOne({
        where: { branch_id, user_id }
      });

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

      const createdReview = await Review.findByPk(review.id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          }
        ]
      });

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

      const review = await Review.findByPk(id);
      if (!review) {
        return ResponseHelper.error(res, 'Review not found', 404);
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        return ResponseHelper.error(res, 'Rating must be between 1 and 5', 400);
      }

      await review.update({ rating, comment });

      const updatedReview = await Review.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city']
          }
        ]
      });

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

      const review = await Review.findByPk(id);
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

      const { count, rows: reviews } = await Review.findAndCountAll({
        where: { user_id },
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'city', 'address']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

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

      const stats = await Review.findOne({
        where: { branch_id },
        attributes: [
          [Review.sequelize.fn('AVG', Review.sequelize.col('rating')), 'averageRating'],
          [Review.sequelize.fn('COUNT', Review.sequelize.col('rating')), 'totalReviews'],
          [Review.sequelize.fn('MIN', Review.sequelize.col('rating')), 'minRating'],
          [Review.sequelize.fn('MAX', Review.sequelize.col('rating')), 'maxRating']
        ],
        raw: true
      });

      // Get rating distribution
      const ratingDistribution = await Review.findAll({
        where: { branch_id },
        attributes: [
          'rating',
          [Review.sequelize.fn('COUNT', Review.sequelize.col('rating')), 'count']
        ],
        group: ['rating'],
        order: [['rating', 'ASC']],
        raw: true
      });

      const statsData = {
        average_rating: parseFloat(stats.averageRating) || 0,
        total_reviews: parseInt(stats.totalReviews) || 0,
        min_rating: parseInt(stats.minRating) || 0,
        max_rating: parseInt(stats.maxRating) || 0,
        rating_distribution: ratingDistribution.reduce((acc, item) => {
          acc[`rating_${item.rating}`] = parseInt(item.count);
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
