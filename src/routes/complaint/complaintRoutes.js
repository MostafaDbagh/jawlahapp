const express = require('express');
const router = express.Router();
const complaintController = require('../../controllers/complaintController');
const { authenticateToken, requireAccountType } = require('../../middleware/auth');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'CUSTOMER_SERVICE'];

// Customer endpoints
router.post('/', authenticateToken, complaintController.create);
router.get('/mine', authenticateToken, complaintController.listMine);

// Admin endpoints
router.get('/', authenticateToken, requireAccountType(ADMIN_TYPES), complaintController.list);
router.patch('/:id', authenticateToken, requireAccountType(ADMIN_TYPES), complaintController.update);

module.exports = router;
