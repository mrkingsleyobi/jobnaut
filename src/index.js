// Main entry point for JobNaut application

const express = require('express');
const envConfig = require('../config/env');
const { createTRPCExpressMiddleware } = require('./api/server');

// Initialize Express app
const app = express();
const PORT = envConfig.getPort();

// Security middleware
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Add security headers
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
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);

// Add request size limits and protection
app.use(express.json({
  limit: '10mb',
  // Prevent prototype pollution
  strict: true
}));

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

// tRPC middleware
const trpcMiddleware = createTRPCExpressMiddleware();
app.use('/trpc', trpcMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'JobNaut API'
  });
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to JobNaut API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      rest: '/api/v1/*',
      trpc: '/trpc/*',
      health: '/health'
    }
  });
});

// API routes
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: envConfig.isDevelopment() ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;