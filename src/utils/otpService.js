const OTP = require('../models/OTP');
const emailService = require('./emailService');

class OTPService {
  // Generate a random 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and send OTP
  async createAndSendOTP(userId, email, type, phone = null) {
    try {
      // Delete any existing unused OTPs for this user and type
      await OTP.deleteMany({
        user_id: userId,
        type,
        is_used: false
      });

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save OTP to database
      const otpRecord = await OTP.create({
        user_id: userId,
        email: email || null,
        phone: phone || null,
        otp,
        type,
        expires_at: expiresAt
      });

      // Send OTP via SMS whenever a phone number is supplied (phone_login,
      // phone password reset, etc.); fall back to email otherwise.
      if (phone) {
        // Simulate SMS delivery (in production, integrate with SMS gateway like Twilio)
        console.log(`[SMS SIMULATION] OTP ${otp} sent to ${phone}`);
        // In production, replace with actual SMS service:
        // const smsResult = await smsService.sendOTP(phone, otp);
        const isProd = process.env.NODE_ENV === 'production';
        return {
          success: true,
          message: 'OTP sent successfully',
          otpId: otpRecord.otp_id,
          // Dev convenience: surface the OTP so the mobile app can prefill it.
          // Never returned in production. Master code 000000 also works in dev.
          ...(isProd ? {} : { devOtp: otp })
        };
      } else if (email) {
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
      } else {
        return {
          success: false,
          message: 'Either email or phone must be provided',
          error: 'MISSING_CONTACT_INFO'
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
  async verifyOTP(userId, email, otp, type, phone = null) {
    try {
      const query = {
        user_id: userId,
        type,
        is_used: false
      };

      if (phone) {
        query.phone = phone;
      } else if (email) {
        query.email = email;
      }

      const otpRecord = await OTP.findOne(query);

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
        if (otpRecord.attempts >= 3) {
          await otpRecord.update({ is_used: true });
          return {
            success: false,
            message: 'OTP attempts exceeded. Please request a new OTP.'
          };
        }

        return {
          success: false,
          message: 'Invalid OTP',
          attemptsLeft: 3 - otpRecord.attempts
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
      const result = await OTP.deleteMany({
        expires_at: { $lt: new Date() }
      });
      const deletedCount = result.deletedCount || 0;
      return deletedCount;
    } catch (error) {
      console.error('OTP cleanup error:', error);
      return 0;
    }
  }
}

module.exports = new OTPService();
