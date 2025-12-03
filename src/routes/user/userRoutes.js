const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { authenticateToken } = require('../../middleware/auth');
const {
  validateFCMToken,
  handleValidationErrors
} = require('../../middleware/validation');

// Protected routes (authentication required)
router.post('/fcm-token', authenticateToken, validateFCMToken, handleValidationErrors, userController.saveFCMToken);

module.exports = router;

