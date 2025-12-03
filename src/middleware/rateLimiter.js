const ResponseHelper = require('../utils/responseHelper');

// Simple in-memory rate limiter for OTP requests
// In production, use Redis or a proper rate limiting library
class RateLimiter {
  constructor() {
    this.requests = new Map(); // phone -> { count, resetTime }
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [phone, data] of this.requests.entries()) {
      if (data.resetTime < now) {
        this.requests.delete(phone);
      }
    }
  }

  // Check if request is allowed
  isAllowed(phone, maxRequests = 3, windowMs = 60 * 60 * 1000) { // 3 requests per hour
    this.cleanup();
    
    const now = Date.now();
    const record = this.requests.get(phone);

    if (!record) {
      // First request
      this.requests.set(phone, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (now > record.resetTime) {
      // Window expired, reset
      this.requests.set(phone, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const remainingTime = Math.ceil((record.resetTime - now) / 1000 / 60); // minutes
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: record.resetTime,
        remainingMinutes: remainingTime
      };
    }

    // Increment count
    record.count += 1;
    return { 
      allowed: true, 
      remaining: maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  // Reset rate limit for a phone (useful after successful verification)
  reset(phone) {
    this.requests.delete(phone);
  }
}

const rateLimiter = new RateLimiter();

// Middleware for OTP request rate limiting
const rateLimitOTPRequest = (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(); // Let validation handle this
  }

  const result = rateLimiter.isAllowed(phone, 3, 60 * 60 * 1000); // 3 requests per hour

  if (!result.allowed) {
    return res.status(429).json(
      ResponseHelper.error(
        `Too many OTP requests. Please try again after ${result.remainingMinutes} minute(s)`,
        { 
          resetTime: new Date(result.resetTime).toISOString(),
          remainingMinutes: result.remainingMinutes
        },
        0
      )
    );
  }

  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  if (result.resetTime) {
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  }

  next();
};

module.exports = {
  rateLimitOTPRequest,
  rateLimiter
};

