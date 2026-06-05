const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cartController');
const { authenticateToken } = require('../../middleware/auth');

// All cart routes require authentication.
router.get('/', authenticateToken, cartController.getCart);
router.post('/items', authenticateToken, cartController.addItem);
router.patch('/items/:product_id', authenticateToken, cartController.updateItem);
router.delete('/items/:product_id', authenticateToken, cartController.removeItem);
router.delete('/', authenticateToken, cartController.clearCart);

module.exports = router;
