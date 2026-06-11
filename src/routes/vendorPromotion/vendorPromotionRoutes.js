const express = require('express');
const router = express.Router();
const VendorPromotionController = require('../../controllers/vendorPromotionController');
const { authenticateToken } = require('../../middleware/auth');

// Public: a restaurant's promo banners for its customer-app page.
router.get('/vendor/:vendorId', VendorPromotionController.listForVendor);

// Owner/admin management (ownership is enforced in the controller).
router.post('/vendor/:vendorId', authenticateToken, VendorPromotionController.create);
router.patch('/:id', authenticateToken, VendorPromotionController.update);
router.delete('/:id', authenticateToken, VendorPromotionController.remove);

module.exports = router;
