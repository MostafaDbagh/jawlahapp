const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');
const { authenticateToken } = require('../../middleware/auth');

// Protected routes (authentication required)
router.get('/', authenticateToken, notificationController.getNotifications);
router.patch('/:id/mark-read', authenticateToken, notificationController.markAsRead);

module.exports = router;

