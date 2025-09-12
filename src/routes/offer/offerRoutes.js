const express = require('express');
const router = express.Router();
const OfferController = require('../../controllers/offerController');
const { authenticateToken } = require('../../middleware/auth');
const { validateOfferCreate, validateOfferUpdate } = require('../../middleware/validation');

// Public routes
router.get('/active', OfferController.getActiveOffers);
router.get('/expired', OfferController.getExpiredOffers);
router.get('/:id', OfferController.getOfferById);

// Branch-specific routes
router.post('/branches/:id', authenticateToken, validateOfferCreate, OfferController.createBranchOffer);

// Subcategory-specific routes
router.post('/branches/:id/subcategories/:sub_id', authenticateToken, validateOfferCreate, OfferController.createSubcategoryOffer);

// Product-specific routes
router.post('/products/:id', authenticateToken, validateOfferCreate, OfferController.createProductOffer);

// Protected routes (require authentication)
router.put('/:id', authenticateToken, validateOfferUpdate, OfferController.updateOffer);
router.delete('/:id', authenticateToken, OfferController.deleteOffer);

module.exports = router;
