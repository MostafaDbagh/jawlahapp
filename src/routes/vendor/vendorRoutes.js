const express = require('express');
const router = express.Router();
const VendorController = require('../../controllers/vendorController');
const { authenticateToken, requireAccountType } = require('../../middleware/auth');
const { validateVendorCreate, validateVendorUpdate } = require('../../middleware/validation');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

// Public endpoints (no authentication required)
router.get('/', VendorController.getAllVendors);
router.get('/popular', VendorController.getPopularVendors);
router.get('/expired-subscriptions', VendorController.getExpiredSubscriptions);

// Restaurants owned by the authenticated user (must precede '/:id')
router.get('/mine', authenticateToken, VendorController.getMyVendors);

router.get('/:id', VendorController.getVendorById);

// Protected endpoints (require authentication)
router.post('/', authenticateToken, validateVendorCreate, VendorController.createVendor);
router.put('/:id', authenticateToken, validateVendorUpdate, VendorController.updateVendor);
router.delete('/:id', authenticateToken, VendorController.deleteVendor);

// Admin-only: block / unblock a restaurant
router.patch('/:id/block', authenticateToken, requireAccountType(ADMIN_TYPES), VendorController.blockVendor);
router.patch('/:id/unblock', authenticateToken, requireAccountType(ADMIN_TYPES), VendorController.unblockVendor);

module.exports = router;
