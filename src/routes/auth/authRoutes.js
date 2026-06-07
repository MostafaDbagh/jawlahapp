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
const { rateLimitOTPRequest, rateLimit } = require('../../middleware/rateLimiter');

// Throttles for the unauthenticated, abuse-prone endpoints.
const registerLimit = rateLimit({ by: ['ip'], max: 5, windowMs: 60 * 60 * 1000, message: 'Too many sign-up attempts. Please try again later.' });
const loginLimit = rateLimit({ by: ['email', 'phone', 'ip'], max: 10, windowMs: 15 * 60 * 1000, message: 'Too many login attempts. Please try again later.' });
const resetLimit = rateLimit({ by: ['email', 'phone', 'ip'], max: 5, windowMs: 60 * 60 * 1000, message: 'Too many password-reset attempts. Please try again later.' });
// Brute-force guard on the 6-digit OTP verification (a code has only 10^6 values).
const otpVerifyLimit = rateLimit({ by: ['phone', 'ip'], max: 10, windowMs: 15 * 60 * 1000, message: 'Too many verification attempts. Please request a new code.' });

// Public routes (no authentication required)
router.post('/register', registerLimit, validateRegistration, handleValidationErrors, authController.register);
router.post('/login', loginLimit, validateLogin, handleValidationErrors, authController.login);
router.post('/request-otp-login', validateRequestOTPLogin, handleValidationErrors, rateLimitOTPRequest, authController.requestOTPLogin);
router.post('/verify-otp-login', otpVerifyLimit, validateVerifyOTPLogin, handleValidationErrors, authController.verifyOTPLogin);
router.post('/request-password-reset', resetLimit, validatePasswordResetRequest, handleValidationErrors, authController.requestPasswordReset);
router.post('/reset-password', otpVerifyLimit, validatePasswordReset, handleValidationErrors, authController.resetPassword);
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
