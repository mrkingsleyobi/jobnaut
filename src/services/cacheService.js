// Cache Service for JobNaut
// Provides unified caching interface with Redis and in-memory fallback

const redisClient = require('../utils/redisClient');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // Default TTL from environment or 5 minutes
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 300;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null if not found
   */
  async get(key) {
    try {
      if (redisClient.isAvailable()) {
        const value = await redisClient.getClient().get(key);
        if (value) {
          try {
            // Try to parse JSON
            return JSON.parse(value);
          } catch {
            // Return as string if not JSON
            return value;
          }
        }
        return null;
      } else {
        // Fallback to in-memory
        const value = redisClient.inMemoryGet(key);
        if (value) {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return null;
      }
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} [ttl] - Time to live in seconds (optional, uses default if not provided)
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      // Stringify value if it's an object
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (redisClient.isAvailable()) {
        if (ttl) {
          await redisClient.getClient().setex(key, ttl, stringValue);
        } else {
          await redisClient.getClient().set(key, stringValue);
        }
        return true;
      } else {
        // Fallback to in-memory
        redisClient.inMemorySet(key, stringValue, ttl);
        return true;
      }
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if successful
   */
  async del(key) {
    try {
      if (redisClient.isAvailable()) {
        await redisClient.getClient().del(key);
        return true;
      } else {
        // Fallback to in-memory
        redisClient.inMemoryDel(key);
        return true;
      }
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<boolean>} True if successful
   */
  async delMultiple(keys) {
    try {
      if (redisClient.isAvailable()) {
        if (keys.length > 0) {
          await redisClient.getClient().del(...keys);
        }
        return true;
      } else {
        // Fallback to in-memory
        keys.forEach((key) => redisClient.inMemoryDel(key));
        return true;
      }
    } catch (error) {
      logger.error('Cache delete multiple error', {
        keys,
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    try {
      if (redisClient.isAvailable()) {
        const result = await redisClient.getClient().exists(key);
        return result === 1;
      } else {
        // Fallback to in-memory
        return redisClient.inMemoryExists(key);
      }
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Invalidate cache by pattern (cache busting)
   * @param {string} pattern - Key pattern (e.g., 'user_*', 'search_*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidate(pattern) {
    try {
      if (redisClient.isAvailable()) {
        const client = redisClient.getClient();
        const keys = await client.keys(pattern);

        if (keys.length > 0) {
          await client.del(...keys);
          logger.info('Cache invalidated', { pattern, count: keys.length });
          return keys.length;
        }
        return 0;
      } else {
        // Fallback to in-memory
        redisClient.inMemoryDelPattern(pattern);
        logger.info('In-memory cache invalidated', { pattern });
        return 0; // Can't track count in fallback
      }
    } catch (error) {
      logger.error('Cache invalidate error', { pattern, error: error.message, stack: error.stack });
      return 0;
    }
  }

  /**
   * Flush all cache (use with caution!)
   * @returns {Promise<boolean>} True if successful
   */
  async flushAll() {
    try {
      if (redisClient.isAvailable()) {
        await redisClient.getClient().flushdb();
        logger.warn('Redis cache flushed');
        return true;
      } else {
        // Fallback to in-memory
        redisClient.inMemoryFlush();
        logger.warn('In-memory cache flushed');
        return true;
      }
    } catch (error) {
      logger.error('Cache flush error', { error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Get cache statistics (only available with Redis)
   * @returns {Promise<Object|null>} Cache statistics or null
   */
  async getStats() {
    try {
      if (redisClient.isAvailable()) {
        const info = await redisClient.getClient().info('stats');
        return {
          connected: true,
          info,
        };
      } else {
        return {
          connected: false,
          mode: 'in-memory',
          size: redisClient.inMemoryStore.size,
        };
      }
    } catch (error) {
      logger.error('Cache stats error', { error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Set value with expiry in milliseconds (for precise timing)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} milliseconds - Time to live in milliseconds
   * @returns {Promise<boolean>} True if successful
   */
  async setex(key, value, milliseconds) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (redisClient.isAvailable()) {
        await redisClient.getClient().psetex(key, milliseconds, stringValue);
        return true;
      } else {
        // Fallback to in-memory (convert to seconds)
        redisClient.inMemorySet(key, stringValue, Math.ceil(milliseconds / 1000));
        return true;
      }
    } catch (error) {
      logger.error('Cache setex error', { key, error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   * @param {string} key - Cache key
   * @param {number} [increment=1] - Amount to increment
   * @returns {Promise<number|null>} New value or null on error
   */
  async incr(key, increment = 1) {
    try {
      if (redisClient.isAvailable()) {
        const result = await redisClient.getClient().incrby(key, increment);
        return result;
      } else {
        // Fallback to in-memory
        const current = redisClient.inMemoryGet(key);
        const newValue = (parseInt(current) || 0) + increment;
        redisClient.inMemorySet(key, String(newValue), this.defaultTTL);
        return newValue;
      }
    } catch (error) {
      logger.error('Cache incr error', { key, error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    try {
      if (redisClient.isAvailable()) {
        return await redisClient.getClient().ttl(key);
      } else {
        // Fallback - approximate from in-memory
        const entry = redisClient.inMemoryStore.get(key);
        if (!entry) {
          return -2;
        }
        if (!entry.expiry) {
          return -1;
        }
        const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
      }
    } catch (error) {
      logger.error('Cache TTL error', { key, error: error.message, stack: error.stack });
      return -2;
    }
  }
}

// Export singleton instance
module.exports = new CacheService();
