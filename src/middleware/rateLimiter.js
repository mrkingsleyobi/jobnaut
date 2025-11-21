/**
 * Rate Limiting Middleware with Tiered Limits
 * Provides different rate limits for authenticated, anonymous, and premium users
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limit tiers configuration
 */
const RATE_LIMIT_TIERS = {
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many requests from this IP. Please try again later or sign in for higher limits.',
  },
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: 'Rate limit exceeded. Please try again later.',
  },
  premium: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window
    message: 'Rate limit exceeded. Please try again later.',
  },
};

/**
 * Endpoint-specific rate limits
 */
const ENDPOINT_LIMITS = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts. Please try again later.',
    skipSuccessfulRequests: true,
  },
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests. Please slow down.',
  },
  chat: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many chat messages. Please wait a moment.',
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many upload requests. Please try again later.',
  },
};

/**
 * Get user tier from request (checks authentication)
 */
function getUserTier(req) {
  // Check if user is authenticated (Clerk auth)
  if (req.auth?.userId) {
    // Check if user has premium subscription
    // This would typically check a database or user metadata
    const isPremium = req.auth.sessionClaims?.premium === true;
    return isPremium ? 'premium' : 'authenticated';
  }

  return 'anonymous';
}

/**
 * Dynamic key generator that includes user tier
 */
function generateKey(req) {
  const tier = getUserTier(req);
  const userId = req.auth?.userId || req.ip;
  return `${tier}:${userId}`;
}

/**
 * Skip rate limiting for certain conditions
 */
function shouldSkip(req) {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/metrics') {
    return true;
  }

  // Skip for internal requests (if behind a trusted proxy)
  if (req.ip === '127.0.0.1' || req.ip === '::1') {
    return true;
  }

  // Skip if rate limiting is disabled (for testing)
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return true;
  }

  return false;
}

/**
 * Custom rate limit handler with logging
 */
function rateLimitHandler(req, res) {
  const tier = getUserTier(req);

  logger.warn('Rate limit exceeded', {
    tier,
    ip: req.ip,
    userId: req.auth?.userId,
    path: req.path,
    userAgent: req.get('user-agent'),
  });

  const config = RATE_LIMIT_TIERS[tier];

  res.status(429).json({
    error: 'Too Many Requests',
    message: config.message,
    retryAfter: Math.ceil(config.windowMs / 1000),
    tier,
  });
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(req, res, next) {
  const originalJson = res.json;

  res.json = function(data) {
    // Add custom rate limit info headers
    const tier = getUserTier(req);
    const config = RATE_LIMIT_TIERS[tier];

    // These will be set by express-rate-limit, but we add tier info
    res.setHeader('X-RateLimit-Tier', tier);

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Create tiered rate limiter
 */
function createTieredRateLimiter(options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const tier = getUserTier(req);
      return RATE_LIMIT_TIERS[tier].max;
    },
    message: (req) => {
      const tier = getUserTier(req);
      return RATE_LIMIT_TIERS[tier].message;
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: generateKey,
    skip: shouldSkip,
    handler: rateLimitHandler,
    ...options,
  });
}

/**
 * Create endpoint-specific rate limiter
 */
function createEndpointLimiter(endpointType, customOptions = {}) {
  const config = ENDPOINT_LIMITS[endpointType];

  if (!config) {
    logger.warn('Unknown endpoint type for rate limiting', { endpointType });
    return createTieredRateLimiter();
  }

  return rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    skip: shouldSkip,
    handler: (req, res) => {
      logger.warn('Endpoint rate limit exceeded', {
        endpointType,
        tier: getUserTier(req),
        ip: req.ip,
        userId: req.auth?.userId,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
    ...customOptions,
  });
}

/**
 * General API rate limiter (backwards compatible)
 */
const apiLimiter = createTieredRateLimiter();

/**
 * Authentication rate limiter
 */
const authLimiter = createEndpointLimiter('auth');

/**
 * Search rate limiter
 */
const searchLimiter = createEndpointLimiter('search');

/**
 * Chat rate limiter
 */
const chatLimiter = createEndpointLimiter('chat');

/**
 * Upload rate limiter
 */
const uploadLimiter = createEndpointLimiter('upload');

/**
 * Get rate limit status for a user
 */
function getRateLimitStatus(req) {
  const tier = getUserTier(req);
  const config = RATE_LIMIT_TIERS[tier];

  return {
    tier,
    limit: config.max,
    windowMs: config.windowMs,
    // Actual remaining count would come from the rate limiter store
  };
}

module.exports = {
  // Main middleware
  apiLimiter,
  authLimiter,
  searchLimiter,
  chatLimiter,
  uploadLimiter,

  // Factories
  createTieredRateLimiter,
  createEndpointLimiter,

  // Headers middleware
  addRateLimitHeaders,

  // Utilities
  getUserTier,
  getRateLimitStatus,
  RATE_LIMIT_TIERS,
  ENDPOINT_LIMITS,
};
