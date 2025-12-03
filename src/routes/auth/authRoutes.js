const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { authenticateToken, requireVerification } = require('../../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateOTPVerification,
  validateProfileUpdate,
  validateRequestOTPLogin,
  validateVerifyOTPLogin,
  handleValidationErrors
} = require('../../middleware/validation');
const { rateLimitOTPRequest } = require('../../middleware/rateLimiter');

// Public routes (no authentication required)
router.post('/register', validateRegistration, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/request-otp-login', validateRequestOTPLogin, handleValidationErrors, rateLimitOTPRequest, authController.requestOTPLogin);
router.post('/verify-otp-login', validateVerifyOTPLogin, handleValidationErrors, authController.verifyOTPLogin);
router.post('/request-password-reset', validatePasswordResetRequest, handleValidationErrors, authController.requestPasswordReset);
router.post('/reset-password', validatePasswordReset, handleValidationErrors, authController.resetPassword);
router.post('/verify-otp', validateOTPVerification, handleValidationErrors, authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/refresh-token', authController.refreshToken);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, handleValidationErrors, authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);

// Email verification route (can be accessed with or without token)
router.post('/verify-email', validateOTPVerification, handleValidationErrors, authController.verifyOTP);

module.exports = router;
