const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { authenticateToken, requireAccountType } = require('../../middleware/auth');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

// Every admin route requires a logged-in platform admin/owner.
router.use(authenticateToken, requireAccountType(ADMIN_TYPES));

// Dashboard / analytics
router.get('/overview', adminController.overview);

// Users
router.get('/users', adminController.listUsers);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);

// Drivers
router.get('/drivers', adminController.listDrivers);
router.post('/drivers', adminController.createDriver);

// Orders (all platform orders with filters)
router.get('/orders', adminController.listOrders);
// Dispatch ops: force re-assignment + full dispatch audit for one order.
router.post('/orders/:id/redispatch', adminController.redispatchOrder);
router.get('/orders/:id/dispatch-history', adminController.getDispatchHistory);

// Restaurants (all approval statuses, incl. pending requests)
router.get('/vendors', adminController.listVendors);

// Platform settings (delivery pricing, support contact, …) — company-controlled.
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
