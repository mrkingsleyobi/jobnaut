// Main entry point for JobNaut application

const express = require('express');
const envConfig = require('../config/env');
const { createTRPCExpressMiddleware } = require('./api/server');
const { initSentry, getSentryErrorHandler } = require('./utils/sentry');

// Initialize Express app
const app = express();
const PORT = envConfig.getPort();

// Initialize Sentry (must be first)
initSentry(app);

// Performance optimization middleware
const { requestTimingMiddleware, startMemoryTracking } = require('./utils/performance');
const { cacheMiddleware } = require('./middleware/cacheMiddleware');

// Security middleware
const cors = require('cors');
const helmet = require('helmet');

// Add security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.clerk.accounts.dev'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com',
      'https://www.yourdomain.com',
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Add compression (install with: npm install compression)
// Note: Uncomment after installing compression package
// const compression = require('compression');
// app.use(compression({
//   level: 6,
//   threshold: 1024,
// }));

// Performance monitoring (should be early in middleware stack)
app.use(requestTimingMiddleware);

// Response caching with ETag support
app.use(cacheMiddleware({ etag: true, lastModified: true }));

// Rate limiting with tiered limits
const {
  apiLimiter,
  authLimiter,
  searchLimiter,
  chatLimiter,
  addRateLimitHeaders
} = require('./middleware/rateLimiter');

// Add rate limit headers
app.use(addRateLimitHeaders);

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);
app.use('/api/v1/jobs/search', searchLimiter);
app.use('/api/v1/chat', chatLimiter);

// Add request size limits and protection
app.use(
  express.json({
    limit: '10mb',
    // Prevent prototype pollution
    strict: true,
  })
);

// Add protection against common attacks
app.use((req, res, next) => {
  // Remove dangerous headers
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
});

// Import routes
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const healthRoutes = require('./routes/health');

// Import metrics middleware
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

// Add metrics middleware (should be early in the middleware stack)
if (process.env.PROMETHEUS_ENABLED !== 'false') {
  app.use(metricsMiddleware);
}

// tRPC middleware
const trpcMiddleware = createTRPCExpressMiddleware();
app.use('/trpc', trpcMiddleware);

// Health check endpoints
app.use('/health', healthRoutes);

// Metrics endpoint for Prometheus
if (process.env.PROMETHEUS_ENABLED !== 'false') {
  app.get('/metrics', metricsEndpoint);
}

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to JobNaut API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      rest: '/api/v1/*',
      trpc: '/trpc/*',
      health: '/health',
    },
  });
});

// API routes
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/chat', chatRoutes);

// Sentry error handler (must be before other error handlers)
app.use(getSentryErrorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: envConfig.isDevelopment() ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start memory tracking
if (process.env.NODE_ENV === 'production') {
  startMemoryTracking(60000); // Track every minute
}

// Performance monitoring endpoint
const { getPerformanceReport, getSlowRequests, checkPerformanceHealth } = require('./utils/performance');
const { getQueryStats } = require('./utils/queryOptimizer');

app.get('/api/performance', (req, res) => {
  const perfReport = getPerformanceReport();
  const queryStats = getQueryStats();
  const slowRequests = getSlowRequests(5);
  const health = checkPerformanceHealth();

  res.json({
    timestamp: new Date().toISOString(),
    performance: perfReport,
    database: queryStats,
    slowRequests,
    health,
  });
});

module.exports = app;
