const User = require('../models/User');
const OTP = require('../models/OTP');
const otpService = require('../utils/otpService');
const jwtService = require('../utils/jwtService');
const { Op } = require('sequelize');

class AuthController {
  // User registration
  async register(req, res) {
    try {
      const { username, email, phone_number, password_hash, account_type } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { 
          [Op.or]: [
            { email },
            { username },
            { phone_number }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email, username, or phone number already exists'
        });
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        phone_number,
        password_hash,
        account_type: account_type || 'CUSTOMER' // Default to customer
      });

      // Send email verification OTP
      const otpResult = await otpService.createAndSendOTP(
        user.user_id,
        user.email,
        'email_verification'
      );

      if (!otpResult.success) {
        console.warn('Failed to send verification OTP:', otpResult.message);
      }

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user.user_id, user.email);
      const refreshToken = jwtService.generateRefreshToken(user.user_id, user.email);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.getPublicProfile(),
          accessToken,
          refreshToken
        },
        otpSent: otpResult.success
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // User login
  async login(req, res) {
    try {
      const { email, password_hash } = req.body;

      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password_hash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incrementFailedAttempts();
        
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Reset failed login attempts on successful login
      await user.resetFailedAttempts();
      
      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user.user_id, user.email);
      const refreshToken = jwtService.generateRefreshToken(user.user_id, user.email);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.getPublicProfile(),
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Send password reset OTP
      const otpResult = await otpService.createAndSendOTP(
        user.user_id,
        user.email,
        'password_reset'
      );

      if (otpResult.success) {
        res.json({
          success: true,
          message: 'Password reset OTP sent to your email'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send password reset OTP',
          error: otpResult.error
        });
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset request failed',
        error: error.message
      });
    }
  }

  // Reset password with OTP
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;

      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify OTP
      const otpVerification = await otpService.verifyOTP(
        user.user_id,
        email,
        otp,
        'password_reset'
      );

      if (!otpVerification.success) {
        return res.status(400).json({
          success: false,
          message: otpVerification.message
        });
      }

      // Update password
      await user.setPassword(newPassword);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: error.message
      });
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { email, otp, type } = req.body;

      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify OTP
      const otpVerification = await otpService.verifyOTP(
        user.user_id,
        email,
        otp,
        type
      );

      if (!otpVerification.success) {
        return res.status(400).json({
          success: false,
          message: otpVerification.message
        });
      }

      // Update user verification status based on type
      if (type === 'email_verification') {
        await user.update({ 
          email_verified: true,
          is_verified: user.phone_verified // Set is_verified if both email and phone are verified
        });
      } else if (type === 'phone_verification') {
        await user.update({ 
          phone_verified: true,
          is_verified: user.email_verified // Set is_verified if both email and phone are verified
        });
      }

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          user: user.getPublicProfile()
        }
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: error.message
      });
    }
  }

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const { email, type } = req.body;

      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Send new OTP
      const otpResult = await otpService.createAndSendOTP(
        user.user_id,
        user.email,
        type
      );

      if (otpResult.success) {
        res.json({
          success: true,
          message: 'OTP resent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to resend OTP',
          error: otpResult.error
        });
      }
    } catch (error) {
      console.error('OTP resend error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP resend failed',
        error: error.message
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user.getPublicProfile()
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { username, phone_number, profile_image, preferred_language, timezone } = req.body;
      const updateData = {};

      if (username) updateData.username = username;
      if (phone_number) updateData.phone_number = phone_number;
      if (profile_image) updateData.profile_image = profile_image;
      if (preferred_language) updateData.preferred_language = preferred_language;
      if (timezone) updateData.timezone = timezone;

      await req.user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: req.user.getPublicProfile()
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Profile update failed',
        error: error.message
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const result = jwtService.verifyToken(refreshToken);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Check if user exists and is active
      const user = await User.findByPk(result.payload.userId);
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User not found or account is inactive'
        });
      }

      // Generate new tokens
      const newAccessToken = jwtService.generateAccessToken(user.user_id, user.email);
      const newRefreshToken = jwtService.generateRefreshToken(user.user_id, user.email);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: error.message
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return a success message
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
