const express = require('express');
const router = express.Router();
const VendorController = require('../../controllers/vendorController');
const { authenticateToken } = require('../../middleware/auth');
const { validateVendorCreate, validateVendorUpdate } = require('../../middleware/validation');

// Public endpoints (no authentication required)
router.get('/', VendorController.getAllVendors);
router.get('/popular', VendorController.getPopularVendors);
router.get('/nearby', VendorController.getNearbyVendors);
router.get('/expired-subscription', authenticateToken, VendorController.getExpiredSubscriptionVendors); // Admin only
router.get('/:id', VendorController.getVendorById);

// Protected endpoints (require authentication)
router.post('/', authenticateToken, validateVendorCreate, VendorController.createVendor); // Admin only
router.put('/:id', authenticateToken, validateVendorUpdate, VendorController.updateVendor);
router.delete('/:id', authenticateToken, VendorController.deleteVendor); // Admin only
router.post('/:id/block', authenticateToken, VendorController.blockVendor); // Admin only

module.exports = router;
