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
router.patch('/:id/cancel', authenticateToken, orderController.cancelOrder);
router.patch('/:id/status', authenticateToken, orderController.updateOrderStatus);

module.exports = router;
