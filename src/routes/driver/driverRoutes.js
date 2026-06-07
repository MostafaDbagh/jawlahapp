const express = require('express');
const router = express.Router();
const driverController = require('../../controllers/driverController');
const { authenticateToken, requireAccountType } = require('../../middleware/auth');

// Every driver route requires a logged-in DRIVER account.
router.use(authenticateToken, requireAccountType(['DRIVER']));

// Profile + availability
router.get('/me', driverController.getProfile);
router.patch('/me/availability', driverController.setAvailability);
router.get('/me/stats', driverController.getStats);

// Push-dispatch offers (the smart-assignment channel). Fixed paths first.
router.get('/offers/pending', driverController.getPendingOffers);
router.post('/offers/:offerId/accept', driverController.acceptOffer);
router.post('/offers/:offerId/decline', driverController.declineOffer);

// Orders — order matters: fixed paths before the parameterised ones.
router.get('/orders/available', driverController.getAvailableOrders);
router.get('/orders/active', driverController.getActiveOrders);
router.get('/orders/history', driverController.getHistory);
router.post('/orders/:id/accept', driverController.acceptOrder);
router.patch('/orders/:id/status', driverController.updateStatus);

module.exports = router;
