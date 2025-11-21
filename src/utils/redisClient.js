// Redis Client Utility for JobNaut
// Handles Redis connection management with fallback to in-memory cache for development

const Redis = require('ioredis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.useInMemory = false;
    this.inMemoryStore = new Map(); // Fallback for development

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    // Check if Redis URL is configured
    const redisUrl = process.env.REDIS_URL;

    // If no Redis URL, use in-memory fallback for development
    if (!redisUrl || process.env.NODE_ENV === 'test') {
      logger.info('Redis URL not configured or test environment - using in-memory cache fallback');
      this.useInMemory = true;
      return;
    }

    try {
      // Parse Redis URL or use default configuration
      const redisConfig = this.parseRedisUrl(redisUrl);

      // Create Redis client with retry strategy
      this.client = new Redis({
        ...redisConfig,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn('Redis connection retry', { attempt: times, delay });
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready to accept commands');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error', { error: error.message, stack: error.stack });
        // Don't switch to in-memory on error, let retry strategy handle it
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });
    } catch (error) {
      logger.error('Failed to initialize Redis client', {
        error: error.message,
        stack: error.stack,
      });
      this.useInMemory = true;
    }
  }

  /**
   * Parse Redis URL into configuration object
   * @param {string} url - Redis URL
   * @returns {Object} Redis configuration
   */
  parseRedisUrl(url) {
    try {
      const parsedUrl = new URL(url);

      return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 6379,
        password: parsedUrl.password || process.env.REDIS_PASSWORD || undefined,
        db: parseInt(parsedUrl.pathname.slice(1)) || 0,
        tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
      };
    } catch (error) {
      logger.error('Failed to parse Redis URL', { error: error.message });
      // Return default configuration
      return {
        host: 'localhost',
        port: 6379,
      };
    }
  }

  /**
   * Get Redis client instance
   * @returns {Redis|null} Redis client or null if using in-memory
   */
  getClient() {
    return this.useInMemory ? null : this.client;
  }

  /**
   * Check if Redis is available
   * @returns {boolean} True if Redis is connected and ready
   */
  isAvailable() {
    return !this.useInMemory && this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * In-memory get (fallback)
   * @param {string} key - Cache key
   * @returns {string|null} Cached value or null
   */
  inMemoryGet(key) {
    const entry = this.inMemoryStore.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.inMemoryStore.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * In-memory set (fallback)
   * @param {string} key - Cache key
   * @param {string} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  inMemorySet(key, value, ttl) {
    const entry = {
      value,
      expiry: ttl ? Date.now() + ttl * 1000 : null,
    };
    this.inMemoryStore.set(key, entry);
  }

  /**
   * In-memory delete (fallback)
   * @param {string} key - Cache key
   */
  inMemoryDel(key) {
    this.inMemoryStore.delete(key);
  }

  /**
   * In-memory exists (fallback)
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  inMemoryExists(key) {
    const entry = this.inMemoryStore.get(key);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.inMemoryStore.delete(key);
      return false;
    }

    return true;
  }

  /**
   * In-memory flush (fallback)
   */
  inMemoryFlush() {
    this.inMemoryStore.clear();
  }

  /**
   * In-memory pattern delete (fallback)
   * @param {string} pattern - Key pattern (supports simple wildcard *)
   */
  inMemoryDelPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete = [];

    for (const key of this.inMemoryStore.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.inMemoryStore.delete(key));
  }

  /**
   * Gracefully close Redis connection
   */
  async disconnect() {
    if (this.client && !this.useInMemory) {
      try {
        await this.client.quit();
        logger.info('Redis connection closed gracefully');
      } catch (error) {
        logger.error('Error closing Redis connection', {
          error: error.message,
          stack: error.stack,
        });
      }
    }
  }
}

// Export singleton instance
module.exports = new RedisClient();
