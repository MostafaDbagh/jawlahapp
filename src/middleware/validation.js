const { body, validationResult } = require('express-validator');
const ResponseHelper = require('../utils/responseHelper');

// Validation rules for user registration
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone_number')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('password_hash')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('account_type')
    .optional()
    .isIn(['CUSTOMER', 'DRIVER', 'SERVICE_PROVIDER_OWNER', 'SERVICE_PROVIDER_ADMIN', 'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'CUSTOMER_SERVICE'])
    .withMessage('Invalid account type')
];

// Validation rules for user login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password_hash')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for password reset request
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

// Validation rules for password reset
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Validation rules for OTP verification
const validateOTPVerification = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  
  body('type')
    .isIn(['password_reset', 'email_verification', 'phone_verification'])
    .withMessage('Invalid OTP type')
];

// Validation rules for profile update
const validateProfileUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('phone_number')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('profile_image')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  
  body('preferred_language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  
  body('timezone')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Timezone must be between 3 and 50 characters')
];

// Validation rules for category creation
const validateCategoryCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Category name must be between 1 and 255 characters')
    .notEmpty()
    .withMessage('Category name is required'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('has_offer')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Offer must be a decimal between 0 and 1 (e.g., 0.15 for 15% off)'),
  
  body('free_delivery')
    .optional()
    .isBoolean()
    .withMessage('Free delivery must be a boolean value')
];

// Validation rules for category update
const validateCategoryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Category name must be between 1 and 255 characters')
    .notEmpty()
    .withMessage('Category name cannot be empty'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('has_offer')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Offer must be a decimal between 0 and 1 (e.g., 0.15 for 15% off)'),
  
  body('free_delivery')
    .optional()
    .isBoolean()
    .withMessage('Free delivery must be a boolean value')
];

// Validation rules for vendor creation
const validateVendorCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Vendor name must be between 1 and 255 characters')
    .notEmpty()
    .withMessage('Vendor name is required'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('about')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('About description must not exceed 2000 characters'),
  
  body('work_time')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'object') {
        const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        
        for (const [day, time] of Object.entries(value)) {
          if (!validDays.includes(day)) {
            throw new Error(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
          }
          if (time && !timeRegex.test(time)) {
            throw new Error(`Invalid time format for ${day}: ${time}. Use format HH:MM-HH:MM`);
          }
        }
      }
      return true;
    }),
  
  body('location')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'object') {
        if (value.lat !== undefined && (typeof value.lat !== 'number' || value.lat < -90 || value.lat > 90)) {
          throw new Error('Latitude must be a number between -90 and 90');
        }
        if (value.lng !== undefined && (typeof value.lng !== 'number' || value.lng < -180 || value.lng > 180)) {
          throw new Error('Longitude must be a number between -180 and 180');
        }
        if (value.city && typeof value.city !== 'string') {
          throw new Error('City must be a string');
        }
      }
      return true;
    }),
  
  body('subscript_date')
    .optional()
    .isISO8601()
    .withMessage('Subscription date must be a valid ISO 8601 date')
];

// Validation rules for vendor update
const validateVendorUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Vendor name must be between 1 and 255 characters')
    .notEmpty()
    .withMessage('Vendor name cannot be empty'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('about')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('About description must not exceed 2000 characters'),
  
  body('work_time')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'object') {
        const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        
        for (const [day, time] of Object.entries(value)) {
          if (!validDays.includes(day)) {
            throw new Error(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
          }
          if (time && !timeRegex.test(time)) {
            throw new Error(`Invalid time format for ${day}: ${time}. Use format HH:MM-HH:MM`);
          }
        }
      }
      return true;
    }),
  
  body('location')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'object') {
        if (value.lat !== undefined && (typeof value.lat !== 'number' || value.lat < -90 || value.lat > 90)) {
          throw new Error('Latitude must be a number between -90 and 90');
        }
        if (value.lng !== undefined && (typeof value.lng !== 'number' || value.lng < -180 || value.lng > 180)) {
          throw new Error('Longitude must be a number between -180 and 180');
        }
        if (value.city && typeof value.city !== 'string') {
          throw new Error('City must be a string');
        }
      }
      return true;
    }),
  
  body('subscript_date')
    .optional()
    .isISO8601()
    .withMessage('Subscription date must be a valid ISO 8601 date'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be a decimal between 0 and 5')
];

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      ResponseHelper.error(
        'Validation failed',
        errors.array().map(error => ({
          field: error.path,
          message: error.msg
        })),
        errors.array().length
      )
    );
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateOTPVerification,
  validateProfileUpdate,
  validateCategoryCreate,
  validateCategoryUpdate,
  validateVendorCreate,
  validateVendorUpdate,
  handleValidationErrors
};
