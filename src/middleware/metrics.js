// Prometheus Metrics Middleware for JobNaut
// Collects and exposes application metrics for monitoring

const promClient = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'jobnaut_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics

// HTTP request counter
const httpRequestsTotal = new promClient.Counter({
  name: 'jobnaut_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'jobnaut_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// HTTP request size histogram
const httpRequestSize = new promClient.Histogram({
  name: 'jobnaut_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// HTTP response size histogram
const httpResponseSize = new promClient.Histogram({
  name: 'jobnaut_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// Active requests gauge
const httpRequestsInProgress = new promClient.Gauge({
  name: 'jobnaut_http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method'],
  registers: [register],
});

// Cache metrics
const cacheHits = new promClient.Counter({
  name: 'jobnaut_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [register],
});

const cacheMisses = new promClient.Counter({
  name: 'jobnaut_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [register],
});

// Database query metrics
const dbQueryDuration = new promClient.Histogram({
  name: 'jobnaut_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const dbQueryErrors = new promClient.Counter({
  name: 'jobnaut_db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['operation', 'model'],
  registers: [register],
});

// AI service metrics
const aiRequestsTotal = new promClient.Counter({
  name: 'jobnaut_ai_requests_total',
  help: 'Total number of AI service requests',
  labelNames: ['provider', 'model', 'status'],
  registers: [register],
});

const aiRequestDuration = new promClient.Histogram({
  name: 'jobnaut_ai_request_duration_seconds',
  help: 'Duration of AI service requests in seconds',
  labelNames: ['provider', 'model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

const aiTokensUsed = new promClient.Counter({
  name: 'jobnaut_ai_tokens_used_total',
  help: 'Total number of AI tokens used',
  labelNames: ['provider', 'model', 'type'],
  registers: [register],
});

// Error counter
const errorsTotal = new promClient.Counter({
  name: 'jobnaut_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
  registers: [register],
});

// Business metrics
// User registration counter
const userRegistrations = new promClient.Counter({
  name: 'jobnaut_user_registrations_total',
  help: 'Total number of user registrations',
  registers: [register],
});

// Active users gauge
const activeUsers = new promClient.Gauge({
  name: 'jobnaut_active_users',
  help: 'Number of currently active users',
  registers: [register],
});

// Job searches counter
const jobSearches = new promClient.Counter({
  name: 'jobnaut_job_searches_total',
  help: 'Total number of job searches performed',
  registers: [register],
});

// Saved jobs counter
const savedJobs = new promClient.Counter({
  name: 'jobnaut_saved_jobs_total',
  help: 'Total number of jobs saved by users',
  registers: [register],
});

// Chat messages counter
const chatMessages = new promClient.Counter({
  name: 'jobnaut_chat_messages_total',
  help: 'Total number of chat messages sent',
  registers: [register],
});

// Skill gap analyses counter
const skillGapAnalyses = new promClient.Counter({
  name: 'jobnaut_skill_gap_analyses_total',
  help: 'Total number of skill gap analyses performed',
  registers: [register],
});

// Search keywords counter
const searchKeywords = new promClient.Counter({
  name: 'jobnaut_search_keywords_total',
  help: 'Total number of searches by keyword',
  labelNames: ['keyword'],
  registers: [register],
});

// Feature usage counter
const featureUsage = new promClient.Counter({
  name: 'jobnaut_feature_usage_total',
  help: 'Total usage count per feature',
  labelNames: ['feature'],
  registers: [register],
});

// Active sessions gauge
const activeSessions = new promClient.Gauge({
  name: 'jobnaut_active_sessions',
  help: 'Number of currently active user sessions',
  registers: [register],
});

// API response time by endpoint summary
const responseTimeSummary = new promClient.Summary({
  name: 'jobnaut_http_response_time_summary',
  help: 'Summary of HTTP response times',
  labelNames: ['method', 'route'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [register],
});

/**
 * Normalize route path for metrics
 * Removes parameters and IDs to group similar routes
 */
function normalizeRoute(path) {
  return path
    .replace(/\/[0-9a-f]{24}/gi, '/:id') // MongoDB ObjectIds
    .replace(/\/[0-9]+/g, '/:id') // Numeric IDs
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid') // UUIDs
    .replace(/\?.*/g, ''); // Remove query strings
}

/**
 * Prometheus metrics middleware
 * Tracks HTTP requests and responses
 */
function metricsMiddleware(req, res, next) {
  // Skip metrics endpoint itself
  if (req.path === '/metrics') {
    return next();
  }

  const start = Date.now();
  const route = normalizeRoute(req.path);
  const method = req.method;

  // Track request size
  const requestSize = parseInt(req.get('content-length') || 0, 10);
  if (requestSize > 0) {
    httpRequestSize.labels(method, route).observe(requestSize);
  }

  // Increment in-progress requests
  httpRequestsInProgress.labels(method).inc();

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    // Track response size
    const responseSize = Buffer.byteLength(data || '', 'utf8');
    httpResponseSize.labels(method, route, res.statusCode).observe(responseSize);

    return res.send(data);
  };

  // Track request completion
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestsTotal.labels(method, route, statusCode).inc();
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
    httpRequestsInProgress.labels(method).dec();

    // Log slow requests
    if (duration > 1) {
      logger.warn('Slow request detected', {
        method,
        route,
        duration: `${duration.toFixed(3)}s`,
        statusCode,
      });
    }
  });

  next();
}

/**
 * Expose metrics endpoint
 */
async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).end('Error generating metrics');
  }
}

/**
 * Track cache hit/miss
 */
function trackCache(cacheName, isHit) {
  if (isHit) {
    cacheHits.labels(cacheName).inc();
  } else {
    cacheMisses.labels(cacheName).inc();
  }
}

/**
 * Track database query
 */
function trackDbQuery(operation, model, duration, error = null) {
  if (error) {
    dbQueryErrors.labels(operation, model).inc();
  }
  dbQueryDuration.labels(operation, model).observe(duration / 1000);
}

/**
 * Track AI request
 */
function trackAiRequest(provider, model, duration, status, tokens = null) {
  aiRequestsTotal.labels(provider, model, status).inc();
  aiRequestDuration.labels(provider, model).observe(duration / 1000);

  if (tokens) {
    if (tokens.prompt) {
      aiTokensUsed.labels(provider, model, 'prompt').inc(tokens.prompt);
    }
    if (tokens.completion) {
      aiTokensUsed.labels(provider, model, 'completion').inc(tokens.completion);
    }
  }
}

/**
 * Track error
 */
function trackError(type, severity = 'error') {
  errorsTotal.labels(type, severity).inc();
}

/**
 * Track user registration
 */
function trackUserRegistration() {
  userRegistrations.inc();
}

/**
 * Track job search
 * @param {string} keyword - Optional search keyword
 */
function trackJobSearch(keyword = null) {
  jobSearches.inc();
  if (keyword) {
    searchKeywords.labels(keyword).inc();
  }
}

/**
 * Track saved job
 */
function trackSavedJob() {
  savedJobs.inc();
}

/**
 * Track chat message
 */
function trackChatMessage() {
  chatMessages.inc();
}

/**
 * Track skill gap analysis
 */
function trackSkillGapAnalysis() {
  skillGapAnalyses.inc();
}

/**
 * Track feature usage
 * @param {string} feature - Feature name
 */
function trackFeatureUsage(feature) {
  featureUsage.labels(feature).inc();
}

/**
 * Set active users count
 * @param {number} count - Number of active users
 */
function setActiveUsers(count) {
  activeUsers.set(count);
}

/**
 * Set active sessions count
 * @param {number} count - Number of active sessions
 */
function setActiveSessions(count) {
  activeSessions.set(count);
}

/**
 * Increment active sessions
 */
function incrementActiveSessions() {
  activeSessions.inc();
}

/**
 * Decrement active sessions
 */
function decrementActiveSessions() {
  activeSessions.dec();
}

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  trackCache,
  trackDbQuery,
  trackAiRequest,
  trackError,
  // Business metrics tracking functions
  trackUserRegistration,
  trackJobSearch,
  trackSavedJob,
  trackChatMessage,
  trackSkillGapAnalysis,
  trackFeatureUsage,
  setActiveUsers,
  setActiveSessions,
  incrementActiveSessions,
  decrementActiveSessions,
  register,
};
