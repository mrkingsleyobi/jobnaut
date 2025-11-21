// Winston Logger Configuration for JobNaut
// Provides structured logging with appropriate levels, formatting, and rotation

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Environment configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const logFormat = process.env.LOG_FORMAT || 'json';
const maxFiles = parseInt(process.env.LOG_MAX_FILES || '14', 10); // 2 weeks with daily rotation
const maxSize = parseInt(process.env.LOG_MAX_SIZE || '10485760', 10); // 10MB

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log formats
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const simpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Define console format for better readability in development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    const metadataKeys = Object.keys(metadata).filter((key) => !['timestamp', 'level', 'message', 'service'].includes(key));
    if (metadataKeys.length > 0) {
      const metadataObj = metadataKeys.reduce((acc, key) => ({ ...acc, [key]: metadata[key] }), {});
      msg += ` ${JSON.stringify(metadataObj)}`;
    }
    return msg;
  })
);

// Select format based on environment
const selectedFormat = logFormat === 'json' ? jsonFormat : simpleFormat;

// Create Winston logger instance
const logger = winston.createLogger({
  level: isTest ? 'error' : logLevel,
  format: selectedFormat,
  defaultMeta: {
    service: 'jobnaut',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || 'unknown'
  },
  transports: [
    // Write all logs to combined.log with rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      tailable: true,
      format: jsonFormat, // Always use JSON for file logs
    }),
    // Write error logs to error.log with rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: maxSize,
      maxFiles: maxFiles,
      tailable: true,
      format: jsonFormat, // Always use JSON for file logs
    }),
    // Write warning logs to warn.log with rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'warn.log'),
      level: 'warn',
      maxsize: maxSize,
      maxFiles: maxFiles,
      tailable: true,
      format: jsonFormat, // Always use JSON for file logs
    }),
  ],
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: jsonFormat,
    }),
  ],
  // Rejection handling (for unhandled promise rejections)
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: jsonFormat,
    }),
  ],
});

// Add console transport in non-production environments
if (isDevelopment && !isTest) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Add console exception handler in development
if (isDevelopment) {
  logger.exceptions.handle(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Helper methods for structured logging

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
logger.logRequest = function (req, res, duration) {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

/**
 * Log database query
 * @param {string} operation - Database operation
 * @param {string} model - Database model
 * @param {number} duration - Query duration in ms
 * @param {Error} error - Error if query failed
 */
logger.logQuery = function (operation, model, duration, error = null) {
  const logData = {
    operation,
    model,
    duration: `${duration}ms`,
  };

  if (error) {
    logger.error('Database Query Failed', { ...logData, error: error.message, stack: error.stack });
  } else if (duration > 1000) {
    logger.warn('Slow Database Query', logData);
  } else {
    logger.debug('Database Query', logData);
  }
};

/**
 * Log AI service request
 * @param {string} provider - AI provider
 * @param {string} model - AI model
 * @param {number} duration - Request duration in ms
 * @param {Object} tokens - Token usage
 * @param {Error} error - Error if request failed
 */
logger.logAI = function (provider, model, duration, tokens = null, error = null) {
  const logData = {
    provider,
    model,
    duration: `${duration}ms`,
    tokens,
  };

  if (error) {
    logger.error('AI Request Failed', { ...logData, error: error.message });
  } else {
    logger.info('AI Request', logData);
  }
};

module.exports = logger;
