/**
 * Performance Monitoring Utility
 * Tracks request timing, memory usage, and provides performance budgets
 */

const logger = require('./logger');
const { register, Counter, Histogram, Gauge } = require('prom-client');

/**
 * Performance metrics
 */
const metrics = {
  // Request duration histogram
  requestDuration: new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in milliseconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  }),

  // Slow request counter
  slowRequests: new Counter({
    name: 'slow_requests_total',
    help: 'Total number of slow requests (>1s)',
    labelNames: ['method', 'route'],
  }),

  // Memory usage gauge
  memoryUsage: new Gauge({
    name: 'nodejs_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'],
  }),

  // Database query duration
  dbQueryDuration: new Histogram({
    name: 'db_query_duration_ms',
    help: 'Duration of database queries in milliseconds',
    labelNames: ['model', 'operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  }),

  // Database query counter
  dbQueryCount: new Counter({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['model', 'operation'],
  }),
};

/**
 * Performance budgets (ms)
 */
const PERFORMANCE_BUDGETS = {
  api: {
    fast: 100,      // Target response time
    acceptable: 500, // Maximum acceptable
    slow: 1000,     // Considered slow
  },
  database: {
    fast: 10,
    acceptable: 50,
    slow: 100,
  },
};

/**
 * Performance tracking store
 */
const performanceStore = {
  requests: [],
  maxRequestsTracked: 1000,
};

/**
 * Request timing middleware
 */
function requestTimingMiddleware(req, res, next) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Track request start
  req.performanceStart = startTime;
  req.memoryStart = startMemory;

  // Override res.end to capture timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    // Record metrics
    const route = getRoutePattern(req);
    metrics.requestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    // Track slow requests
    if (duration > PERFORMANCE_BUDGETS.api.slow) {
      metrics.slowRequests
        .labels(req.method, route)
        .inc();

      logger.warn('Slow request detected', {
        method: req.method,
        route,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        memoryDelta: {
          heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
          external: (endMemory.external - startMemory.external) / 1024 / 1024,
        },
      });
    }

    // Store request data
    storeRequestPerformance({
      method: req.method,
      route,
      duration,
      statusCode: res.statusCode,
      timestamp: new Date(startTime),
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      slow: duration > PERFORMANCE_BUDGETS.api.slow,
    });

    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Performance-Budget',
      duration <= PERFORMANCE_BUDGETS.api.fast ? 'fast' :
      duration <= PERFORMANCE_BUDGETS.api.acceptable ? 'acceptable' : 'slow'
    );

    return originalEnd.apply(res, args);
  };

  next();
}

/**
 * Extract route pattern from request
 */
function getRoutePattern(req) {
  // Try to get the route from Express
  if (req.route && req.route.path) {
    return req.route.path;
  }

  // Fallback to URL path with parameter normalization
  return req.path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
}

/**
 * Store request performance data
 */
function storeRequestPerformance(data) {
  performanceStore.requests.push(data);

  // Keep only recent requests
  if (performanceStore.requests.length > performanceStore.maxRequestsTracked) {
    performanceStore.requests.shift();
  }
}

/**
 * Database query timing wrapper
 */
function trackDatabaseQuery(model, operation, queryFn) {
  return async (...args) => {
    const startTime = Date.now();

    try {
      const result = await queryFn(...args);
      const duration = Date.now() - startTime;

      // Record metrics
      metrics.dbQueryDuration
        .labels(model, operation)
        .observe(duration);

      metrics.dbQueryCount
        .labels(model, operation)
        .inc();

      // Log slow queries
      if (duration > PERFORMANCE_BUDGETS.database.slow) {
        logger.warn('Slow database query', {
          model,
          operation,
          duration: `${duration}ms`,
        });
      }

      return result;
    } catch (error) {
      metrics.dbQueryCount
        .labels(model, operation)
        .inc();
      throw error;
    }
  };
}

/**
 * Memory tracking (run periodically)
 */
function trackMemoryUsage() {
  const usage = process.memoryUsage();

  metrics.memoryUsage.labels('heapTotal').set(usage.heapTotal);
  metrics.memoryUsage.labels('heapUsed').set(usage.heapUsed);
  metrics.memoryUsage.labels('external').set(usage.external);
  metrics.memoryUsage.labels('rss').set(usage.rss);

  // Log if memory is high (> 80% of heap)
  const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
  if (heapUsagePercent > 80) {
    logger.warn('High memory usage detected', {
      heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    });
  }
}

/**
 * Start memory tracking interval
 */
function startMemoryTracking(intervalMs = 60000) {
  return setInterval(trackMemoryUsage, intervalMs);
}

/**
 * Get performance report
 */
function getPerformanceReport() {
  const recentRequests = performanceStore.requests.slice(-100);

  if (recentRequests.length === 0) {
    return {
      requests: 0,
      avgDuration: 0,
      slowRequests: 0,
      fastRequests: 0,
    };
  }

  const totalDuration = recentRequests.reduce((sum, req) => sum + req.duration, 0);
  const slowCount = recentRequests.filter(req => req.slow).length;
  const fastCount = recentRequests.filter(req =>
    req.duration <= PERFORMANCE_BUDGETS.api.fast
  ).length;

  return {
    requests: recentRequests.length,
    avgDuration: Math.round(totalDuration / recentRequests.length),
    slowRequests: slowCount,
    fastRequests: fastCount,
    slowPercentage: ((slowCount / recentRequests.length) * 100).toFixed(2),
    fastPercentage: ((fastCount / recentRequests.length) * 100).toFixed(2),
    memory: process.memoryUsage(),
  };
}

/**
 * Get slow requests
 */
function getSlowRequests(limit = 10) {
  return performanceStore.requests
    .filter(req => req.slow)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
    .map(req => ({
      ...req,
      timestamp: req.timestamp.toISOString(),
      memoryDelta: `${(req.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
    }));
}

/**
 * Performance health check
 */
function checkPerformanceHealth() {
  const report = getPerformanceReport();
  const memoryUsage = process.memoryUsage();
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  const issues = [];

  // Check average response time
  if (report.avgDuration > PERFORMANCE_BUDGETS.api.acceptable) {
    issues.push({
      type: 'slow_response',
      severity: 'warning',
      message: `Average response time (${report.avgDuration}ms) exceeds budget (${PERFORMANCE_BUDGETS.api.acceptable}ms)`,
    });
  }

  // Check slow request percentage
  const slowPercent = parseFloat(report.slowPercentage);
  if (slowPercent > 10) {
    issues.push({
      type: 'high_slow_requests',
      severity: 'warning',
      message: `${slowPercent}% of requests are slow (>1s)`,
    });
  }

  // Check memory usage
  if (heapUsagePercent > 80) {
    issues.push({
      type: 'high_memory',
      severity: 'critical',
      message: `Memory usage at ${heapUsagePercent.toFixed(2)}%`,
    });
  }

  return {
    healthy: issues.length === 0,
    issues,
    report,
  };
}

module.exports = {
  requestTimingMiddleware,
  trackDatabaseQuery,
  trackMemoryUsage,
  startMemoryTracking,
  getPerformanceReport,
  getSlowRequests,
  checkPerformanceHealth,
  metrics,
  PERFORMANCE_BUDGETS,
};
