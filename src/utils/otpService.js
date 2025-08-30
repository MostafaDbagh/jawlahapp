const OTP = require('../models/OTP');
const emailService = require('./emailService');

class OTPService {
  // Generate a random 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and send OTP
  async createAndSendOTP(userId, email, type) {
    try {
      // Delete any existing unused OTPs for this user and type
      await OTP.destroy({
        where: {
          user_id: userId,
          type,
          is_used: false
        }
      });

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save OTP to database
      const otpRecord = await OTP.create({
        user_id: userId,
        email,
        otp,
        type,
        expires_at: expiresAt
      });

      // Send OTP via email
      const emailResult = await emailService.sendOTP(email, otp, type);

      if (emailResult.success) {
        return {
          success: true,
          message: 'OTP sent successfully',
          otpId: otpRecord.otp_id
        };
      } else {
        // If email fails, delete the OTP record
        await otpRecord.destroy();
        return {
          success: false,
          message: 'Failed to send OTP email',
          error: emailResult.error
        };
      }
    } catch (error) {
      console.error('OTP creation error:', error);
      return {
        success: false,
        message: 'Failed to create OTP',
        error: error.message
      };
    }
  }

  // Verify OTP
  async verifyOTP(userId, email, otp, type) {
    try {
      const otpRecord = await OTP.findOne({
        where: {
          user_id: userId,
          email,
          type,
          is_used: false
        }
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      // Check if OTP is expired
      if (otpRecord.isExpired()) {
        await otpRecord.update({ is_used: true });
        return {
          success: false,
          message: 'OTP has expired'
        };
      }

      // Check if OTP matches
      if (otpRecord.otp !== otp) {
        // Increment attempts
        await otpRecord.update({
          attempts: otpRecord.attempts + 1
        });

        // If attempts exceed limit, mark as used
        if (otpRecord.attempts + 1 >= 3) {
          await otpRecord.update({ is_used: true });
          return {
            success: false,
            message: 'OTP attempts exceeded. Please request a new OTP.'
          };
        }

        return {
          success: false,
          message: 'Invalid OTP',
          attemptsLeft: 3 - (otpRecord.attempts + 1)
        };
      }

      // Mark OTP as used
      await otpRecord.update({ is_used: true });

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: 'Failed to verify OTP',
        error: error.message
      };
    }
  }

  // Clean up expired OTPs
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.destroy({
        where: {
          expires_at: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });
      console.log(`Cleaned up ${result} expired OTPs`);
      return result;
    } catch (error) {
      console.error('OTP cleanup error:', error);
      return 0;
    }
  }
}

module.exports = new OTPService();
