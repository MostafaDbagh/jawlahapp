const express = require('express');
const router = express.Router();
const contactController = require('../../controllers/contactController');
const { authenticateToken, optionalAuth, requireAccountType } = require('../../middleware/auth');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'CUSTOMER_SERVICE'];

// Public submission (token optional — used to prefill the sender's details).
router.post('/', optionalAuth, contactController.create);

// Admin endpoints
router.get('/', authenticateToken, requireAccountType(ADMIN_TYPES), contactController.list);
router.patch('/:id', authenticateToken, requireAccountType(ADMIN_TYPES), contactController.update);

module.exports = router;
