const User = require('../models/User');
const OTP = require('../models/OTP');
const otpService = require('../utils/otpService');
const jwtService = require('../utils/jwtService');
const ResponseHelper = require('../utils/responseHelper');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');

class AuthController {
  // User registration
  async register(req, res) {
    try {
      const { 
        username, 
        email, 
        country_code, 
        phone_number, 
        date_of_birth, 
        gender, 
        password_hash, 
        account_type 
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { 
          [Op.or]: [
            { email },
            { username },
            { 
              [Op.and]: [
                { country_code },
                { phone_number }
              ]
            }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json(
          ResponseHelper.error('User with this email, username, or phone number already exists', null, 0)
        );
      }

      // Generate salt and hash password manually
      const salt = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(password_hash + salt, 12);

      // Create new user
      const user = await User.create({
        username,
        email,
        country_code,
        phone_number,
        date_of_birth,
        gender,
        password_hash: hashedPassword,
        salt,
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

      res.status(201).json(
        ResponseHelper.success({
          user: user.getPublicProfile(),
          accessToken,
          refreshToken,
          otpSent: otpResult.success
        }, 'User registered successfully', 1)
      );
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json(
        ResponseHelper.error('Registration failed', error.message, 0)
      );
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
        return res.status(401).json(
          ResponseHelper.error('Invalid email or password', null, 0)
        );
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json(
          ResponseHelper.error('Account is not active', null, 0)
        );
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json(
          ResponseHelper.error('Account is temporarily locked due to multiple failed login attempts', null, 0)
        );
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password_hash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incrementFailedAttempts();
        
        return res.status(401).json(
          ResponseHelper.error('Invalid email or password', null, 0)
        );
      }

      // Reset failed login attempts on successful login
      await user.resetFailedAttempts();
      
      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user.user_id, user.email);
      const refreshToken = jwtService.generateRefreshToken(user.user_id, user.email);

      res.json(
        ResponseHelper.success({
          user: user.getPublicProfile(),
          accessToken,
          refreshToken
        }, 'Login successful', 1)
      );
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(
        ResponseHelper.error('Login failed', error.message, 0)
      );
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
        return res.status(404).json(
          ResponseHelper.error('User not found', null, 0)
        );
      }

      // Send password reset OTP
      const otpResult = await otpService.createAndSendOTP(
        user.user_id,
        user.email,
        'password_reset'
      );

      if (otpResult.success) {
        res.json(
          ResponseHelper.success(null, 'Password reset OTP sent to your email', 0)
        );
      } else {
        res.status(500).json(
          ResponseHelper.error('Failed to send password reset OTP', otpResult.error, 0)
        );
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json(
        ResponseHelper.error('Password reset request failed', error.message, 0)
      );
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
        return res.status(404).json(
          ResponseHelper.error('User not found', null, 0)
        );
      }

      // Verify OTP
      const otpVerification = await otpService.verifyOTP(
        user.user_id,
        email,
        otp,
        'password_reset'
      );

      if (!otpVerification.success) {
        return res.status(400).json(
          ResponseHelper.error(otpVerification.message, null, 0)
        );
      }

      // Update password
      await user.setPassword(newPassword);

      res.json(
        ResponseHelper.success(null, 'Password reset successfully', 0)
      );
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json(
        ResponseHelper.error('Password reset failed', error.message, 0)
      );
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
        return res.status(400).json(
          ResponseHelper.error(otpVerification.message, null, 0)
        );
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

      res.json(
        ResponseHelper.success({
          user: user.getPublicProfile()
        }, 'OTP verified successfully', 1)
      );
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json(
        ResponseHelper.error('OTP verification failed', error.message, 0)
      );
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
        return res.status(404).json(
          ResponseHelper.error('User not found', null, 0)
        );
      }

      // Send new OTP
      const otpResult = await otpService.createAndSendOTP(
        user.user_id,
        user.email,
        type
      );

      if (otpResult.success) {
        res.json(
          ResponseHelper.success(null, 'OTP resent successfully', 0)
        );
      } else {
        res.status(500).json(
          ResponseHelper.error('Failed to resend OTP', otpResult.error, 0)
        );
      }
    } catch (error) {
      console.error('OTP resend error:', error);
      res.status(500).json(
        ResponseHelper.error('OTP resend failed', error.message, 0)
      );
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      res.json(
        ResponseHelper.success({
          user: req.user.getPublicProfile()
        }, 'Profile retrieved successfully', 1)
      );
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to get profile', error.message, 0)
      );
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

      res.json(
        ResponseHelper.success({
          user: req.user.getPublicProfile()
        }, 'Profile updated successfully', 1)
      );
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json(
        ResponseHelper.error('Profile update failed', error.message, 0)
      );
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json(
          ResponseHelper.error('Refresh token is required', null, 0)
        );
      }

      // Verify refresh token
      const result = jwtService.verifyToken(refreshToken);
      
      if (!result.success) {
        return res.status(401).json(
          ResponseHelper.error('Invalid refresh token', null, 0)
        );
      }

      // Check if user exists and is active
      const user = await User.findByPk(result.payload.userId);
      if (!user || !user.is_active) {
        return res.status(401).json(
          ResponseHelper.error('User not found or account is inactive', null, 0)
        );
      }

      // Generate new tokens
      const newAccessToken = jwtService.generateAccessToken(user.user_id, user.email);
      const newRefreshToken = jwtService.generateRefreshToken(user.user_id, user.email);

      res.json(
        ResponseHelper.success({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }, 'Token refreshed successfully', 1)
      );
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json(
        ResponseHelper.error('Token refresh failed', error.message, 0)
      );
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return a success message
      res.json(
        ResponseHelper.success(null, 'Logged out successfully', 0)
      );
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json(
        ResponseHelper.error('Logout failed', error.message, 0)
      );
    }
  }
}

module.exports = new AuthController();
