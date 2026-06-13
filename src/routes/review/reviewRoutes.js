const express = require('express');
const router = express.Router();
const ReviewController = require('../../controllers/reviewController');
const { authenticateToken, requireAccountType } = require('../../middleware/auth');
const { validateReviewCreate, validateReviewUpdate } = require('../../middleware/validation');

// Merchant/admin: reviews for their restaurant(s) or all (admin). Defined before
// param routes so "incoming" isn't swallowed by a :id match.
router.get(
  '/incoming',
  authenticateToken,
  requireAccountType(['SERVICE_PROVIDER_OWNER', 'PLATFORM_OWNER', 'PLATFORM_ADMIN']),
  ReviewController.getIncomingReviews
);

// Public routes
router.get('/branches/:id', ReviewController.getBranchReviews);
router.get('/branches/:branch_id/stats', ReviewController.getBranchReviewStats);

// Protected routes (require authentication)
router.post('/branches/:id', authenticateToken, validateReviewCreate, ReviewController.createReview);
router.put('/:id', authenticateToken, validateReviewUpdate, ReviewController.updateReview);
router.delete('/:id', authenticateToken, ReviewController.deleteReview);

// User-specific routes
router.get('/user/:user_id', authenticateToken, ReviewController.getUserReviews);

module.exports = router;
