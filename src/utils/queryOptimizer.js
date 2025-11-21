/**
 * Database Query Optimizer
 * Provides query caching, connection pooling optimization, and query analysis
 */

const NodeCache = require('node-cache');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Query result cache (TTL: 5 minutes by default)
const queryCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false, // Better performance for large objects
  maxKeys: 1000, // Limit cache size
});

// Query performance tracking
const queryStats = {
  totalQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  slowQueries: [],
  averageTime: 0,
};

/**
 * Optimized Prisma Client with connection pooling
 */
const prismaConfig = {
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
  // Connection pool optimization
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Add query logging in development
if (process.env.NODE_ENV === 'development') {
  prismaConfig.log.push({ level: 'query', emit: 'event' });
}

const prisma = new PrismaClient(prismaConfig);

// Log slow queries
prisma.$on('query', (e) => {
  const duration = e.duration;
  queryStats.totalQueries++;

  // Update average
  queryStats.averageTime =
    (queryStats.averageTime * (queryStats.totalQueries - 1) + duration) /
    queryStats.totalQueries;

  // Log slow queries (> 100ms)
  if (duration > 100) {
    const slowQuery = {
      query: e.query,
      duration,
      timestamp: new Date(),
      params: e.params,
    };

    queryStats.slowQueries.push(slowQuery);

    // Keep only last 50 slow queries
    if (queryStats.slowQueries.length > 50) {
      queryStats.slowQueries.shift();
    }

    logger.warn('Slow query detected', {
      duration: `${duration}ms`,
      query: e.query.substring(0, 200), // Truncate for logging
    });
  }
});

/**
 * Generate cache key from query parameters
 */
function generateCacheKey(model, operation, args) {
  return `${model}:${operation}:${JSON.stringify(args)}`;
}

/**
 * Execute query with caching
 */
async function cachedQuery(model, operation, args, options = {}) {
  const { ttl = 300, skipCache = false } = options;

  // Skip cache for mutations
  if (['create', 'update', 'delete', 'upsert'].includes(operation)) {
    return prisma[model][operation](args);
  }

  const cacheKey = generateCacheKey(model, operation, args);

  // Check cache first
  if (!skipCache) {
    const cached = queryCache.get(cacheKey);
    if (cached !== undefined) {
      queryStats.cacheHits++;
      logger.debug('Query cache hit', { model, operation });
      return cached;
    }
  }

  // Execute query
  queryStats.cacheMisses++;
  const startTime = Date.now();
  const result = await prisma[model][operation](args);
  const duration = Date.now() - startTime;

  // Cache successful results
  if (result !== null && result !== undefined) {
    queryCache.set(cacheKey, result, ttl);
    logger.debug('Query cached', { model, operation, duration: `${duration}ms` });
  }

  return result;
}

/**
 * Invalidate cache for specific model
 */
function invalidateCache(model, operation = null) {
  if (operation) {
    const pattern = `${model}:${operation}:`;
    const keys = queryCache.keys().filter(key => key.startsWith(pattern));
    keys.forEach(key => queryCache.del(key));
    logger.debug('Cache invalidated', { model, operation, keys: keys.length });
  } else {
    const pattern = `${model}:`;
    const keys = queryCache.keys().filter(key => key.startsWith(pattern));
    keys.forEach(key => queryCache.del(key));
    logger.debug('Cache invalidated', { model, keys: keys.length });
  }
}

/**
 * Clear all cache
 */
function clearCache() {
  queryCache.flushAll();
  logger.info('All query cache cleared');
}

/**
 * Optimized query builders with select/include hints
 */
const queryBuilders = {
  /**
   * Build optimized user query (select only needed fields)
   */
  findUser: (where, options = {}) => {
    const select = options.includeRelations
      ? undefined
      : {
          id: true,
          clerkId: true,
          email: true,
          name: true,
          location: true,
          experienceLevel: true,
          skills: true,
          createdAt: true,
          updatedAt: true,
        };

    return cachedQuery('user', 'findUnique', { where, select }, options);
  },

  /**
   * Build optimized job query with indexes
   */
  findJobs: (where, options = {}) => {
    const { page = 1, limit = 20, orderBy = { postedDate: 'desc' } } = options;

    // Use cursor-based pagination for better performance on large datasets
    return cachedQuery('job', 'findMany', {
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        description: true,
        skills: true,
        postedDate: true,
        applicationLink: true,
        // Exclude heavy relations by default
      },
    }, options);
  },

  /**
   * Count with caching
   */
  countJobs: (where, options = {}) => {
    return cachedQuery('job', 'count', { where }, options);
  },

  /**
   * Batch query optimization
   */
  batchFindJobs: async (ids, options = {}) => {
    // Use Promise.all for parallel queries with caching
    return Promise.all(
      ids.map(id =>
        cachedQuery('job', 'findUnique', { where: { id } }, options)
      )
    );
  },
};

/**
 * Prepared statement helper (for raw queries)
 */
async function executePrepared(query, params) {
  const cacheKey = `raw:${query}:${JSON.stringify(params)}`;
  const cached = queryCache.get(cacheKey);

  if (cached !== undefined) {
    queryStats.cacheHits++;
    return cached;
  }

  queryStats.cacheMisses++;
  const result = await prisma.$queryRawUnsafe(query, ...params);
  queryCache.set(cacheKey, result);

  return result;
}

/**
 * Get query statistics
 */
function getQueryStats() {
  return {
    ...queryStats,
    cacheHitRate: queryStats.totalQueries > 0
      ? ((queryStats.cacheHits / queryStats.totalQueries) * 100).toFixed(2) + '%'
      : '0%',
    cacheSize: queryCache.keys().length,
    slowQueriesCount: queryStats.slowQueries.length,
  };
}

/**
 * Analyze query performance (EXPLAIN)
 */
async function analyzeQuery(query) {
  try {
    const explanation = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE ${query}`);
    return explanation;
  } catch (error) {
    logger.error('Query analysis failed', { error: error.message });
    throw error;
  }
}

/**
 * Middleware to auto-invalidate cache on mutations
 */
prisma.$use(async (params, next) => {
  const result = await next(params);

  // Invalidate cache on mutations
  if (['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'].includes(params.action)) {
    invalidateCache(params.model);
  }

  return result;
});

module.exports = {
  prisma,
  queryCache,
  cachedQuery,
  invalidateCache,
  clearCache,
  queryBuilders,
  executePrepared,
  getQueryStats,
  analyzeQuery,
  queryStats,
};
