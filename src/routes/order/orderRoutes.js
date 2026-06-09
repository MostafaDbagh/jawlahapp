const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');
const { authenticateToken } = require('../../middleware/auth');

// All order routes require authentication.
router.post('/', authenticateToken, orderController.createOrder);
router.get('/', authenticateToken, orderController.getOrders);
// Restaurant/admin "Jawlah box" (must precede '/:id')
router.get('/incoming', authenticateToken, orderController.getIncomingOrders);
router.get('/:id', authenticateToken, orderController.getOrder);
// No customer cancellation route by design: once a Cash-on-Delivery order is
// placed it is final and cannot be cancelled or edited by the customer
// (Keeta-style). Restaurants/admins can still cancel for operational
// exceptions via PATCH '/:id/status'.
router.patch('/:id/status', authenticateToken, orderController.updateOrderStatus);

module.exports = router;
