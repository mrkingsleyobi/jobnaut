/**
 * Response Caching Middleware
 * Implements Cache-Control headers, ETag support, and conditional requests
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Cache configuration by route pattern
 */
const cacheConfig = {
  // Public routes with long cache
  '/api/v1/jobs': {
    maxAge: 300, // 5 minutes
    public: true,
    mustRevalidate: true,
  },
  '/api/v1/jobs/search': {
    maxAge: 180, // 3 minutes
    public: true,
    mustRevalidate: true,
  },

  // User-specific routes with short cache
  '/api/v1/user': {
    maxAge: 60, // 1 minute
    public: false,
    private: true,
  },

  // Static content with long cache
  '/static': {
    maxAge: 86400, // 24 hours
    public: true,
    immutable: true,
  },

  // Health checks - no cache
  '/health': {
    maxAge: 0,
    noStore: true,
  },

  // Metrics - no cache
  '/metrics': {
    maxAge: 0,
    noStore: true,
  },
};

/**
 * Generate ETag from response body
 */
function generateETag(body) {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Parse Cache-Control header
 */
function parseCacheControl(header) {
  if (!header) return {};

  const directives = {};
  header.split(',').forEach(directive => {
    const [key, value] = directive.trim().split('=');
    directives[key] = value || true;
  });

  return directives;
}

/**
 * Match route to cache configuration
 */
function getCacheConfigForRoute(path) {
  // Exact match
  if (cacheConfig[path]) {
    return cacheConfig[path];
  }

  // Pattern match
  for (const [pattern, config] of Object.entries(cacheConfig)) {
    if (path.startsWith(pattern)) {
      return config;
    }
  }

  // Default: no cache for safety
  return { maxAge: 0, noCache: true };
}

/**
 * Build Cache-Control header value
 */
function buildCacheControlHeader(config) {
  const parts = [];

  if (config.noStore) {
    parts.push('no-store');
    return parts.join(', ');
  }

  if (config.noCache) {
    parts.push('no-cache');
  }

  if (config.public) {
    parts.push('public');
  } else if (config.private) {
    parts.push('private');
  }

  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }

  if (config.sMaxAge !== undefined) {
    parts.push(`s-maxage=${config.sMaxAge}`);
  }

  if (config.mustRevalidate) {
    parts.push('must-revalidate');
  }

  if (config.immutable) {
    parts.push('immutable');
  }

  if (config.staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.staleIfError) {
    parts.push(`stale-if-error=${config.staleIfError}`);
  }

  return parts.join(', ');
}

/**
 * Cache middleware with ETag support
 */
function cacheMiddleware(options = {}) {
  const {
    enabled = true,
    etag = true,
    lastModified = false,
  } = options;

  return (req, res, next) => {
    // Skip if caching is disabled
    if (!enabled || req.method !== 'GET') {
      return next();
    }

    // Get cache configuration for this route
    const cacheConf = getCacheConfigForRoute(req.path);

    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send to add cache headers
    res.send = function(body) {
      // Add Cache-Control header
      const cacheControl = buildCacheControlHeader(cacheConf);
      res.setHeader('Cache-Control', cacheControl);

      // Add Vary header for proper caching
      res.setHeader('Vary', 'Accept-Encoding, Authorization');

      // Generate and check ETag
      if (etag && body && res.statusCode === 200) {
        const entityTag = generateETag(body);
        res.setHeader('ETag', entityTag);

        // Check If-None-Match for conditional request
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === entityTag) {
          logger.debug('ETag match - returning 304', { path: req.path });
          res.status(304);
          return originalSend.call(this, '');
        }
      }

      // Add Last-Modified if requested
      if (lastModified && !res.getHeader('Last-Modified')) {
        res.setHeader('Last-Modified', new Date().toUTCString());
      }

      // Log cache decision
      logger.debug('Cache headers set', {
        path: req.path,
        cacheControl,
        status: res.statusCode,
      });

      return originalSend.call(this, body);
    };

    // Override json to add cache headers
    res.json = function(body) {
      // Add Cache-Control header
      const cacheControl = buildCacheControlHeader(cacheConf);
      res.setHeader('Cache-Control', cacheControl);

      // Add Vary header
      res.setHeader('Vary', 'Accept-Encoding, Authorization');

      // Generate and check ETag
      if (etag && body && res.statusCode === 200) {
        const entityTag = generateETag(body);
        res.setHeader('ETag', entityTag);

        // Check If-None-Match
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === entityTag) {
          logger.debug('ETag match - returning 304', { path: req.path });
          res.status(304);
          return originalSend.call(this, '');
        }
      }

      return originalJson.call(this, body);
    };

    // Check If-Modified-Since for conditional request
    if (lastModified && req.headers['if-modified-since']) {
      const ifModifiedSince = new Date(req.headers['if-modified-since']);
      const lastMod = res.getHeader('Last-Modified');

      if (lastMod && new Date(lastMod) <= ifModifiedSince) {
        logger.debug('Not modified - returning 304', { path: req.path });
        res.status(304).end();
        return;
      }
    }

    next();
  };
}

/**
 * Middleware to explicitly disable caching
 */
function noCache() {
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  };
}

/**
 * Middleware for long-term caching (immutable content)
 */
function longTermCache(maxAge = 31536000) {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
    next();
  };
}

/**
 * Add custom cache configuration
 */
function addCacheConfig(pattern, config) {
  cacheConfig[pattern] = config;
  logger.info('Cache configuration added', { pattern, config });
}

module.exports = {
  cacheMiddleware,
  noCache,
  longTermCache,
  addCacheConfig,
  generateETag,
  cacheConfig,
};
