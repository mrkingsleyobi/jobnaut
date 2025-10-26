// Security Logger Service for JobNaut
// Handles logging of security events and monitoring

const winston = require('winston');
const path = require('path');

/**
 * Security Logger Service
 */
class SecurityLogger {
  constructor() {
    // Create logs directory if it doesn't exist
    const logDirPath = path.join(__dirname, '../logs');
    const fs = require('fs');
    if (!fs.existsSync(logDirPath)) {
      fs.mkdirSync(logDirPath, { recursive: true });
    }
    const logDir = logDirPath;

    // Create security logger with multiple transports
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'jobnaut-security' },
      transports: [
        // Write all security logs to file
        new winston.transports.File({
          filename: path.join(logDir, 'security.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),

        // Write error logs to separate file
        new winston.transports.File({
          filename: path.join(logDir, 'security-error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    // If we're not in production, also log to console
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  /**
   * Log authentication events
   * @param {string} eventType - Type of authentication event
   * @param {Object} data - Event data
   */
  logAuthEvent(eventType, data) {
    const logData = {
      event: 'auth',
      type: eventType,
      ...data,
      timestamp: new Date().toISOString()
    };

    switch (eventType) {
      case 'login_success':
        this.logger.info('User login successful', logData);
        break;
      case 'login_failure':
        this.logger.warn('User login failed', logData);
        break;
      case 'logout':
        this.logger.info('User logout', logData);
        break;
      case 'token_refresh':
        this.logger.info('User token refreshed', logData);
        break;
      case 'session_expired':
        this.logger.warn('User session expired', logData);
        break;
      default:
        this.logger.info('Authentication event', logData);
    }
  }

  /**
   * Log suspicious activities
   * @param {string} activityType - Type of suspicious activity
   * @param {Object} data - Activity data
   */
  logSuspiciousActivity(activityType, data) {
    const logData = {
      event: 'suspicious_activity',
      type: activityType,
      ...data,
      timestamp: new Date().toISOString()
    };

    this.logger.warn('Suspicious activity detected', logData);
  }

  /**
   * Log access control events
   * @param {string} resource - Resource being accessed
   * @param {string} action - Action being performed
   * @param {Object} data - Access data
   */
  logAccessControl(resource, action, data) {
    const logData = {
      event: 'access_control',
      resource,
      action,
      ...data,
      timestamp: new Date().toISOString()
    };

    if (data.allowed === false) {
      this.logger.warn('Access denied', logData);
    } else {
      this.logger.info('Access granted', logData);
    }
  }

  /**
   * Log data access events
   * @param {string} dataType - Type of data being accessed
   * @param {Object} data - Access data
   */
  logDataAccess(dataType, data) {
    const logData = {
      event: 'data_access',
      dataType,
      ...data,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Sensitive data accessed', logData);
  }

  /**
   * Log security incidents
   * @param {string} incidentType - Type of security incident
   * @param {Object} data - Incident data
   */
  logSecurityIncident(incidentType, data) {
    const logData = {
      event: 'security_incident',
      type: incidentType,
      ...data,
      timestamp: new Date().toISOString()
    };

    this.logger.error('Security incident detected', logData);
  }

  /**
   * Log encryption/decryption events
   * @param {string} operation - Encryption or decryption operation
   * @param {Object} data - Operation data
   */
  logCryptoOperation(operation, data) {
    const logData = {
      event: 'crypto_operation',
      operation,
      ...data,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Cryptographic operation performed', logData);
  }
}

module.exports = new SecurityLogger();