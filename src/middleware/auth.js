const jwtService = require('../utils/jwtService');
const User = require('../models/User');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const result = jwtService.verifyToken(token);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Check if user still exists and is active
    const user = await User.findByPk(result.payload.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account is inactive'
      });
    }

    // Add user info to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user is verified
const requireVerification = async (req, res, next) => {
  try {
    if (!req.user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Account verification required'
      });
    }
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification check failed'
    });
  }
};

// Middleware to check user role (for future use)
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // For now, we'll use a simple role check
      // You can extend this based on your role system
      if (roles && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role check failed'
      });
    }
  };
};

// Middleware to check account type
const requireAccountType = (accountTypes) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (accountTypes && !accountTypes.includes(req.user.account_type)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient account type permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Account type check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Account type check failed'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireVerification,
  requireRole,
  requireAccountType
};
