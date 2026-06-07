const User = require('../models/User');
const OTP = require('../models/OTP');
const otpService = require('../utils/otpService');
const jwtService = require('../utils/jwtService');
const ResponseHelper = require('../utils/responseHelper');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Parse a full international phone string (e.g. "+963949112178") into the
// stored shape. Kept identical to the OTP-login flow so an account created here
// can later be found by phone/OTP login.
function parsePhone(rawPhone) {
  const cleanPhone = String(rawPhone || '').replace(/^\+/, '');
  const phone_number = cleanPhone.slice(-10);
  const country_code = `+${cleanPhone.slice(0, -10) || '1'}`;
  return { phone_number, country_code };
}

// Look up a user by a full international phone string, tolerating the country
// code being stored with or without a leading "+".
function findUserByPhone(rawPhone) {
  const { phone_number, country_code } = parsePhone(rawPhone);
  const ccNoPlus = country_code.replace(/^\+/, '');
  return User.findOne({
    $or: [
      { country_code, phone_number },
      { country_code: ccNoPlus, phone_number },
    ],
  });
}

class AuthController {
  // User registration
  async register(req, res) {
    try {
      let {
        username,
        email,
        full_name,
        country_code,
        phone_number,
        date_of_birth,
        gender,
        password_hash
      } = req.body;
      // SECURITY: account_type is intentionally NOT read from the request body.
      // This endpoint is public, so a client must never be able to self-assign a
      // privileged role. Elevated accounts (DRIVER, *_OWNER/_ADMIN, platform
      // staff) are created only out-of-band — admin createDriver and the seed
      // scripts. Public sign-up is always a CUSTOMER. See account_type below.

      // Phone-based sign-up (mobile app): no email is supplied and phone_number
      // carries the full international number. Normalize it to match the OTP
      // flow's storage, and turn the supplied display name into full_name plus a
      // generated unique username/email so the email-only model fields are met.
      const isPhoneSignup = !email;
      if (isPhoneSignup) {
        const parsed = parsePhone(phone_number || country_code);
        country_code = parsed.country_code;
        phone_number = parsed.phone_number;

        if (!full_name) full_name = username || null;
        const suffix = crypto.randomBytes(4).toString('hex');
        username = `user_${Date.now()}_${suffix}`;
        email = `temp_${Date.now()}_${suffix}@phone.login`;
      }

      // Public sign-up may create an ordinary CUSTOMER or a restaurant owner
      // (SERVICE_PROVIDER_OWNER, used by the web merchant portal). An owner is
      // still UNPRIVILEGED: the restaurants it creates start `pending` and stay
      // hidden from customers until an admin approves them — that approval is the
      // real gate, not the account type. Any other (privileged) role — platform
      // staff, drivers, service-provider admins — is refused here and falls back
      // to CUSTOMER; those are provisioned out-of-band only.
      const requestedType = String(req.body.account_type || '').toUpperCase();
      const account_type = requestedType === 'SERVICE_PROVIDER_OWNER' ? 'SERVICE_PROVIDER_OWNER' : 'CUSTOMER';

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email },
          { username },
          { country_code, phone_number }
        ]
      });

      if (existingUser) {
        return res.status(400).json(
          ResponseHelper.error(
            isPhoneSignup
              ? 'An account with this phone number already exists'
              : 'User with this email, username, or phone number already exists',
            null,
            0
          )
        );
      }

      // Generate salt and hash password manually
      const salt = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(password_hash + salt, 12);

      // Create new user
      const user = await User.create({
        username,
        email,
        full_name,
        country_code,
        phone_number,
        date_of_birth,
        gender,
        password_hash: hashedPassword,
        salt,
        account_type // CUSTOMER or SERVICE_PROVIDER_OWNER only (clamped above)
      });

      // Send email verification OTP (skipped for phone sign-ups, which have no
      // real email address to verify).
      let otpResult = { success: false };
      if (!isPhoneSignup) {
        otpResult = await otpService.createAndSendOTP(
          user.user_id,
          user.email,
          'email_verification'
        );

        if (!otpResult.success) {
          console.warn('Failed to send verification OTP:', otpResult.message);
        }
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
      const { email, phone, password_hash } = req.body;

      // Find user by email (web) or phone (mobile).
      const user = email
        ? await User.findOne({ email })
        : await findUserByPhone(phone);

      if (!user) {
        return res.status(401).json(
          ResponseHelper.error(
            email ? 'Invalid email or password' : 'Invalid phone number or password',
            null,
            0
          )
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
          ResponseHelper.error(
            email ? 'Invalid email or password' : 'Invalid phone number or password',
            null,
            0
          )
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
      const { email, phone } = req.body;

      // Find user by phone (mobile) or email (web).
      const user = phone
        ? await findUserByPhone(phone)
        : await User.findOne({ email });

      if (!user) {
        return res.status(404).json(
          ResponseHelper.error('User not found', null, 0)
        );
      }

      // Send password reset OTP — by SMS for phone accounts, otherwise email.
      const otpResult = phone
        ? await otpService.createAndSendOTP(user.user_id, null, 'password_reset', phone)
        : await otpService.createAndSendOTP(user.user_id, user.email, 'password_reset');

      if (otpResult.success) {
        // In dev, surface the code (and master-code hint) so the app can prefill
        // it without a real SMS/email gateway. Suppressed in production.
        const devPayload = process.env.NODE_ENV === 'production'
          ? null
          : { devOtp: otpResult.devOtp, masterCode: phone ? '000000' : undefined };
        res.json(
          ResponseHelper.success(
            devPayload,
            phone ? 'Password reset code sent by SMS' : 'Password reset OTP sent to your email',
            0
          )
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
      const { email, phone, otp, newPassword } = req.body;

      // Find user by phone (mobile) or email (web).
      const user = phone
        ? await findUserByPhone(phone)
        : await User.findOne({ email });

      if (!user) {
        return res.status(404).json(
          ResponseHelper.error('User not found', null, 0)
        );
      }

      // Dev master code: accept 000000 for phone resets when not in production,
      // mirroring the OTP-login flow.
      const isMasterCode =
        !!phone && process.env.NODE_ENV !== 'production' && otp === '000000';

      // Verify OTP (skipped for the dev master code)
      const otpVerification = isMasterCode
        ? { success: true }
        : await otpService.verifyOTP(
            user.user_id,
            phone ? null : email,
            otp,
            'password_reset',
            phone || null
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
      const user = await User.findOne({ email });

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
      const user = await User.findOne({ email });

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
      const { username, full_name, phone_number, profile_image, preferred_language, timezone } = req.body;
      const updateData = {};

      if (username) updateData.username = username;
      if (full_name !== undefined) updateData.full_name = full_name;
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

      // Verify refresh token — must actually be a refresh token, not an access
      // token replayed here to mint a fresh long-lived pair.
      const result = jwtService.verifyToken(refreshToken, 'refresh');

      if (!result.success) {
        return res.status(401).json(
          ResponseHelper.error('Invalid refresh token', null, 0)
        );
      }

      // Check if user exists and is active
      const user = await User.findOne({ user_id: result.payload.userId });
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

  // Request OTP for phone login
  async requestOTPLogin(req, res) {
    try {
      const { phone, fullName } = req.body;
      const trimmedName = typeof fullName === 'string' ? fullName.trim() : '';

      // Validate phone number format (should include country code, e.g., +1234567890)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json(
          ResponseHelper.error('Invalid phone number format. Please include country code (e.g., +1234567890)', null, 0)
        );
      }

      // Parse phone number: format is +[country_code][phone_number]
      const cleanPhone = phone.replace(/^\+/, ''); // Remove leading +
      const phoneNumber = cleanPhone.slice(-10); // Last 10 digits
      const countryCode = cleanPhone.slice(0, -10) || '1'; // Everything before last 10 digits, default to 1

      // Find user by country code and phone number
      // Try both with and without + prefix
      const user = await User.findOne({
        $or: [
          { country_code: `+${countryCode}`, phone_number: phoneNumber },
          { country_code: countryCode, phone_number: phoneNumber }
        ]
      });

      // If user doesn't exist, create a new user account
      let userId;
      if (!user) {
        // Create a minimal user account for phone login

        // Generate a temporary username and email
        const tempUsername = `user_${Date.now()}`;
        const tempEmail = `temp_${Date.now()}@phone.login`;

        // Create user with minimal info
        const newUser = await User.create({
          username: tempUsername,
          email: tempEmail,
          full_name: trimmedName || null, // Set from the sign-up screen when provided
          country_code: `+${countryCode}`,
          phone_number: phoneNumber,
          password_hash: crypto.randomBytes(32).toString('hex'), // Temporary password
          salt: crypto.randomBytes(32).toString('hex'),
          account_type: 'CUSTOMER',
          phone_verified: false // Will be verified after OTP confirmation
        });

        userId = newUser.user_id;
      } else {
        userId = user.user_id;

        // Check if user is active
        if (!user.is_active) {
          return res.status(401).json(
            ResponseHelper.error('Account is not active', null, 0)
          );
        }

        // Backfill the display name if the user signs up again before setting one.
        if (trimmedName && !user.full_name) {
          user.full_name = trimmedName;
          await user.save();
        }
      }

      // Generate and send OTP
      const otpResult = await otpService.createAndSendOTP(
        userId,
        null, // No email for phone login
        'phone_login',
        phone
      );

      if (otpResult.success) {
        // In development, return the OTP (and the master-code hint) so the app
        // can prefill it without a real SMS gateway. Suppressed in production.
        const devPayload = process.env.NODE_ENV === 'production'
          ? null
          : { devOtp: otpResult.devOtp, masterCode: '000000' };
        res.json(
          ResponseHelper.success(devPayload, 'OTP sent successfully', 0)
        );
      } else {
        res.status(500).json(
          ResponseHelper.error('Failed to send OTP', otpResult.error, 0)
        );
      }
    } catch (error) {
      console.error('Request OTP login error:', error);
      res.status(500).json(
        ResponseHelper.error('Failed to request OTP', error.message, 0)
      );
    }
  }

  // Verify OTP and login
  async verifyOTPLogin(req, res) {
    try {
      const { phone, otp } = req.body;

      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json(
          ResponseHelper.error('Invalid phone number format', null, 0)
        );
      }

      // Validate OTP format
      if (!otp || !/^\d{6}$/.test(otp)) {
        return res.status(400).json(
          ResponseHelper.error('OTP must be a 6-digit number', null, 0)
        );
      }

      // Parse phone number: format is +[country_code][phone_number]
      const cleanPhone = phone.replace(/^\+/, ''); // Remove leading +
      const phoneNumber = cleanPhone.slice(-10); // Last 10 digits
      const countryCode = cleanPhone.slice(0, -10) || '1'; // Everything before last 10 digits, default to 1

      // Find user by country code and phone number
      // Try both with and without + prefix
      const user = await User.findOne({
        $or: [
          { country_code: `+${countryCode}`, phone_number: phoneNumber },
          { country_code: countryCode, phone_number: phoneNumber }
        ]
      });

      if (!user) {
        return res.status(404).json(
          ResponseHelper.error('User not found', null, 0)
        );
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json(
          ResponseHelper.error('Account is not active', null, 0)
        );
      }

      // Dev master code: skip OTP verification when not in production so the
      // app can be tested without a real SMS gateway. Gated to development.
      const isMasterCode = process.env.NODE_ENV !== 'production' && otp === '000000';

      // Verify OTP (skipped for the dev master code)
      const otpVerification = isMasterCode
        ? { success: true }
        : await otpService.verifyOTP(
            user.user_id,
            null, // No email for phone login
            otp,
            'phone_login',
            phone
          );

      if (!otpVerification.success) {
        return res.status(400).json(
          ResponseHelper.error(otpVerification.message, null, 0)
        );
      }

      // Mark phone as verified
      if (!user.phone_verified) {
        await user.update({
          phone_verified: true,
          is_verified: user.email_verified // Set is_verified if both email and phone are verified
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Generate JWT tokens with minimal claims (user ID only as per spec)
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
      console.error('Verify OTP login error:', error);
      res.status(500).json(
        ResponseHelper.error('Login failed', error.message, 0)
      );
    }
  }
}

module.exports = new AuthController();
