const ResponseHelper = require('../utils/responseHelper');

// Simple in-memory rate limiter.
// ⚠️ IMPORTANT: this store lives in a single process's memory. It works for a
// single long-running instance, but on serverless (Vercel) or a multi-instance
// deployment each process has its own counters, so the effective limit is
// multiplied by the number of instances. Before production scale-out, back this
// with Redis / Upstash (or use `express-rate-limit` + a shared store).
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

// Generic, configurable rate-limit middleware factory.
//   by:       ordered list of request fields to key on; first present wins.
//             'ip' uses req.ip (needs `app.set('trust proxy', …)` behind a proxy).
//   max:      allowed requests per window per key.
//   windowMs: window length in ms.
// The key is namespaced per-field so different limiters never collide, and the
// IP is always folded in so a single client can't bypass by varying the body.
const rateLimit = ({ by = ['ip'], max = 10, windowMs = 15 * 60 * 1000, message } = {}) => {
  return (req, res, next) => {
    let identifier = null;
    for (const field of by) {
      if (field === 'ip') { identifier = identifier || `ip:${req.ip}`; continue; }
      const value = req.body && req.body[field];
      if (value) { identifier = `${field}:${String(value).toLowerCase()}`; break; }
    }
    const key = identifier || `ip:${req.ip}`;

    const result = rateLimiter.isAllowed(key, max, windowMs);
    if (!result.allowed) {
      return res.status(429).json(
        ResponseHelper.error(
          message || `Too many requests. Please try again in ${result.remainingMinutes} minute(s).`,
          { remainingMinutes: result.remainingMinutes },
          0
        )
      );
    }
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    if (result.resetTime) {
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    }
    next();
  };
};

module.exports = {
  rateLimitOTPRequest,
  rateLimit,
  rateLimiter
};

