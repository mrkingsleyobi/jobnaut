// Server startup file for JobNaut application
// Sets up Express with tRPC middleware, CORS, Helmet security, and rate limiting
// Includes proper error handling and logging with Winston
// Integrates Clerk authentication middleware

// Load environment variables first
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// Import application and configuration
const app = require('./index');
const envConfig = require('../config/env');

// Import Winston logger
const winston = require('winston');

// Create Winston logger instance
const logger = winston.createLogger({
  level: envConfig.isDevelopment() ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'jobnaut-api' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    // Write all logs to `combined.log`
    new winston.transports.File({ filename: './logs/combined.log' })
  ]
});

// If we're not in production, log to the console as well
if (envConfig.isDevelopment()) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.clerk.accounts.dev"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Configure CORS with environment-based settings
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins based on environment
    const allowedOrigins = envConfig.isDevelopment()
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ]
      : [
          'https://yourdomain.com',
          'https://www.yourdomain.com'
        ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: envConfig.isDevelopment() ? 500 : 100, // Higher limit for development
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);
app.use('/trpc/', apiLimiter);

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
});

// Clerk authentication middleware (optional - can be applied to specific routes)
const clerkMiddleware = (req, res, next) => {
  // Only require auth for protected routes
  if (req.path.startsWith('/api/v1/user') || req.path.startsWith('/trpc/')) {
    // For tRPC routes, we need to check if they require authentication
    // We'll apply auth to all tRPC routes and let the tRPC middleware handle authorization
    if (req.path.startsWith('/trpc/')) {
      // Apply our custom auth middleware for tRPC routes
      const { authMiddleware } = require('./auth/middleware');
      return authMiddleware(req, res, next);
    }
    ClerkExpressRequireAuth()(req, res, next);
  } else {
    next();
  }
};

// Apply Clerk middleware
app.use(clerkMiddleware);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Log error with Winston
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body'
    });
  }

  // Handle Clerk authentication errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Handle rate limit errors
  if (err.name === 'TooManyRequestsError') {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded'
    });
  }

  // Generic error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: envConfig.isDevelopment()
      ? err.message
      : 'An unexpected error occurred'
  });
});

const PORT = envConfig.getPort();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server only when this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`JobNaut API server running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
    console.log(`JobNaut API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
  });
}

module.exports = app;