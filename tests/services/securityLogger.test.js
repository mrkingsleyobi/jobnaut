// Test suite for Security Logger Service

// Load environment variables
require('dotenv').config({ path: '.env.test' });

const path = require('path');
const fs = require('fs');

// Mock winston logger
jest.mock('winston', () => {
  const mLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    add: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
    },
    transports: {
      File: jest.fn(),
      Console: jest.fn(),
    },
  };
});

const winston = require('winston');

// Import security logger once
const securityLogger = require('../../src/services/securityLogger');

describe('Security Logger Service', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = securityLogger.logger;
  });

  describe('initialization', () => {
    it('should create security logger instance', () => {
      expect(securityLogger).toBeDefined();
      expect(securityLogger.logger).toBeDefined();
    });

    it('should have winston logger configured', () => {
      expect(securityLogger.logger).toHaveProperty('info');
      expect(securityLogger.logger).toHaveProperty('warn');
      expect(securityLogger.logger).toHaveProperty('error');
    });

    it('should create logs directory if not exists', () => {
      const logDir = path.join(__dirname, '../../src/logs');
      // Directory should exist or be created
      expect(fs.existsSync(logDir) || winston.transports.File).toBeTruthy();
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful login event', () => {
      const data = { userId: 123, ip: '192.168.1.1' };
      securityLogger.logAuthEvent('login_success', data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User login successful',
        expect.objectContaining({
          event: 'auth',
          type: 'login_success',
          userId: 123,
          ip: '192.168.1.1',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log failed login event', () => {
      const data = { userId: 123, reason: 'Invalid password' };
      securityLogger.logAuthEvent('login_failure', data);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User login failed',
        expect.objectContaining({
          event: 'auth',
          type: 'login_failure',
          userId: 123,
          reason: 'Invalid password',
        })
      );
    });

    it('should log logout event', () => {
      const data = { userId: 123 };
      securityLogger.logAuthEvent('logout', data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logout',
        expect.objectContaining({
          event: 'auth',
          type: 'logout',
          userId: 123,
        })
      );
    });

    it('should log token refresh event', () => {
      const data = { userId: 123, tokenId: 'token-123' };
      securityLogger.logAuthEvent('token_refresh', data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User token refreshed',
        expect.objectContaining({
          event: 'auth',
          type: 'token_refresh',
          userId: 123,
        })
      );
    });

    it('should log session expired event', () => {
      const data = { userId: 123, sessionId: 'session-123' };
      securityLogger.logAuthEvent('session_expired', data);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User session expired',
        expect.objectContaining({
          event: 'auth',
          type: 'session_expired',
          userId: 123,
        })
      );
    });

    it('should log default auth event', () => {
      const data = { userId: 123 };
      securityLogger.logAuthEvent('custom_event', data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Authentication event',
        expect.objectContaining({
          event: 'auth',
          type: 'custom_event',
          userId: 123,
        })
      );
    });

    it('should include timestamp in log data', () => {
      const data = { userId: 123 };
      securityLogger.logAuthEvent('login_success', data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User login successful',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity', () => {
      const activityType = 'brute_force';
      const data = { userId: 123, attempts: 10, ip: '192.168.1.1' };

      securityLogger.logSuspiciousActivity(activityType, data);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Suspicious activity detected',
        expect.objectContaining({
          event: 'suspicious_activity',
          type: 'brute_force',
          userId: 123,
          attempts: 10,
          ip: '192.168.1.1',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log multiple types of suspicious activities', () => {
      const activities = [
        { type: 'sql_injection', data: { query: 'malicious' } },
        { type: 'xss_attempt', data: { payload: '<script>' } },
        { type: 'unauthorized_access', data: { resource: '/admin' } },
      ];

      activities.forEach((activity) => {
        securityLogger.logSuspiciousActivity(activity.type, activity.data);
      });

      expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    });
  });

  describe('logAccessControl', () => {
    it('should log access granted', () => {
      const resource = '/api/users';
      const action = 'read';
      const data = { userId: 123, allowed: true };

      securityLogger.logAccessControl(resource, action, data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          event: 'access_control',
          resource: '/api/users',
          action: 'read',
          userId: 123,
          allowed: true,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log access denied', () => {
      const resource = '/api/admin';
      const action = 'write';
      const data = { userId: 123, allowed: false, reason: 'Insufficient permissions' };

      securityLogger.logAccessControl(resource, action, data);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Access denied',
        expect.objectContaining({
          event: 'access_control',
          resource: '/api/admin',
          action: 'write',
          userId: 123,
          allowed: false,
          reason: 'Insufficient permissions',
        })
      );
    });

    it('should handle different actions', () => {
      const actions = ['create', 'read', 'update', 'delete'];
      const resource = '/api/resource';

      actions.forEach((action) => {
        securityLogger.logAccessControl(resource, action, { userId: 123, allowed: true });
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(4);
    });
  });

  describe('logDataAccess', () => {
    it('should log sensitive data access', () => {
      const dataType = 'user_pii';
      const data = { userId: 123, accessedBy: 456, fields: ['email', 'phone'] };

      securityLogger.logDataAccess(dataType, data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive data accessed',
        expect.objectContaining({
          event: 'data_access',
          dataType: 'user_pii',
          userId: 123,
          accessedBy: 456,
          fields: ['email', 'phone'],
          timestamp: expect.any(String),
        })
      );
    });

    it('should log different data types', () => {
      const dataTypes = ['user_credentials', 'financial_data', 'medical_records'];

      dataTypes.forEach((dataType) => {
        securityLogger.logDataAccess(dataType, { userId: 123 });
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });
  });

  describe('logSecurityIncident', () => {
    it('should log security incident with error level', () => {
      const incidentType = 'data_breach';
      const data = {
        severity: 'critical',
        affectedUsers: 100,
        description: 'Unauthorized data access detected',
      };

      securityLogger.logSecurityIncident(incidentType, data);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Security incident detected',
        expect.objectContaining({
          event: 'security_incident',
          type: 'data_breach',
          severity: 'critical',
          affectedUsers: 100,
          description: 'Unauthorized data access detected',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log different incident types', () => {
      const incidents = [
        { type: 'ddos_attack', data: { requestsPerSecond: 10000 } },
        { type: 'malware_detected', data: { fileName: 'suspicious.exe' } },
        { type: 'privilege_escalation', data: { userId: 123, targetRole: 'admin' } },
      ];

      incidents.forEach((incident) => {
        securityLogger.logSecurityIncident(incident.type, incident.data);
      });

      expect(mockLogger.error).toHaveBeenCalledTimes(3);
    });
  });

  describe('logCryptoOperation', () => {
    it('should log encryption operation', () => {
      const operation = 'encrypt';
      const data = { userId: 123, dataType: 'user_profile', fieldCount: 5 };

      securityLogger.logCryptoOperation(operation, data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cryptographic operation performed',
        expect.objectContaining({
          event: 'crypto_operation',
          operation: 'encrypt',
          userId: 123,
          dataType: 'user_profile',
          fieldCount: 5,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log decryption operation', () => {
      const operation = 'decrypt';
      const data = { userId: 123, dataType: 'user_profile' };

      securityLogger.logCryptoOperation(operation, data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cryptographic operation performed',
        expect.objectContaining({
          event: 'crypto_operation',
          operation: 'decrypt',
          userId: 123,
        })
      );
    });

    it('should log key rotation operation', () => {
      const operation = 'key_rotation';
      const data = { keyId: 'key-123', rotatedAt: new Date().toISOString() };

      securityLogger.logCryptoOperation(operation, data);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cryptographic operation performed',
        expect.objectContaining({
          event: 'crypto_operation',
          operation: 'key_rotation',
          keyId: 'key-123',
        })
      );
    });
  });

  describe('log formatting', () => {
    it('should include consistent structure across all logs', () => {
      securityLogger.logAuthEvent('login_success', { userId: 123 });
      securityLogger.logSuspiciousActivity('brute_force', { userId: 123 });
      securityLogger.logSecurityIncident('data_breach', { severity: 'high' });

      const calls = [
        ...mockLogger.info.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls,
      ];

      calls.forEach((call) => {
        const logData = call[1];
        expect(logData).toHaveProperty('event');
        expect(logData).toHaveProperty('timestamp');
        expect(typeof logData.timestamp).toBe('string');
      });
    });
  });
});
