const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');
const { authenticateToken } = require('../../middleware/auth');

// All order routes require authentication.
router.post('/', authenticateToken, orderController.createOrder);
// Jawlaha Box (errand) order — no restaurant; dispatches to drivers on create.
router.get('/box/config', authenticateToken, orderController.getBoxConfig);
router.post('/box', authenticateToken, orderController.createBoxOrder);
router.get('/', authenticateToken, orderController.getOrders);
// Restaurant/admin "Jawlah box" (must precede '/:id')
router.get('/incoming', authenticateToken, orderController.getIncomingOrders);
// CSV export of the merchant's own orders for their accountant (precede '/:id').
router.get('/incoming/export', authenticateToken, orderController.exportIncomingOrders);
router.get('/:id', authenticateToken, orderController.getOrder);
// No customer cancellation route by design: once a Cash-on-Delivery order is
// placed it is final and cannot be cancelled or edited by the customer
// (Keeta-style). Restaurants/admins can still cancel for operational
// exceptions via PATCH '/:id/status'.
router.patch('/:id/status', authenticateToken, orderController.updateOrderStatus);

module.exports = router;
