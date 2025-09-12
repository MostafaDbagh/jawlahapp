const express = require('express');
const router = express.Router();
const VendorController = require('../../controllers/vendorController');
const { authenticateToken } = require('../../middleware/auth');
const { validateVendorCreate, validateVendorUpdate } = require('../../middleware/validation');

// Public endpoints (no authentication required)
router.get('/', VendorController.getAllVendors);
router.get('/popular', VendorController.getPopularVendors);
router.get('/expired-subscriptions', VendorController.getExpiredSubscriptions);
router.get('/:id', VendorController.getVendorById);

// Protected endpoints (require authentication)
router.post('/', authenticateToken, validateVendorCreate, VendorController.createVendor);
router.put('/:id', authenticateToken, validateVendorUpdate, VendorController.updateVendor);
router.delete('/:id', authenticateToken, VendorController.deleteVendor);

module.exports = router;
