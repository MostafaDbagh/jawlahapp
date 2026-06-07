const jwt = require('jsonwebtoken');

class JWTService {
  // Generate JWT token
  generateToken(payload, expiresIn = '7d') {
    try {
      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn,
        issuer: 'jwalahapp',
        audience: 'jwalahapp-users'
      });
    } catch (error) {
      console.error('JWT generation error:', error);
      throw new Error('Failed to generate token');
    }
  }

  // Verify JWT token. When `expectedType` is given (e.g. 'access' / 'refresh'),
  // a token that carries a DIFFERENT `type` claim is rejected — this stops a
  // long-lived refresh token (or a password_reset token) from being replayed as
  // an access token, and stops an access token from minting new tokens at
  // /refresh-token. Tokens with no `type` claim (legacy) are still accepted.
  verifyToken(token, expectedType = null) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (expectedType && decoded.type && decoded.type !== expectedType) {
        return {
          success: false,
          message: 'Invalid token type',
          error: 'WRONG_TYPE'
        };
      }
      return {
        success: true,
        payload: decoded
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          success: false,
          message: 'Token has expired',
          error: 'EXPIRED'
        };
      } else if (error.name === 'JsonWebTokenError') {
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID'
        };
      } else {
        return {
          success: false,
          message: 'Token verification failed',
          error: 'VERIFICATION_FAILED'
        };
      }
    }
  }

  // Generate access token
  generateAccessToken(userId, email) {
    return this.generateToken(
      { userId, email, type: 'access' },
      process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    );
  }

  // Generate refresh token
  generateRefreshToken(userId, email) {
    return this.generateToken(
      { userId, email, type: 'refresh' },
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );
  }

  // Generate password reset token
  generatePasswordResetToken(userId, email) {
    return this.generateToken(
      { userId, email, type: 'password_reset' },
      '1h'
    );
  }

  // Decode token without verification (for getting payload)
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new JWTService();
