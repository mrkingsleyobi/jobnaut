// Test suite for Encryption Service

// Load environment variables
require('dotenv').config({ path: '.env.test' });

const crypto = require('crypto');

// Mock logger to prevent console output during tests
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const logger = require('../../src/utils/logger');

// Import encryption service once
const encryptionService = require('../../src/services/encryption');

describe('Encryption Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getKey', () => {
    it('should generate encryption key from environment variable', () => {
      const key = encryptionService.getKey();
      expect(key).toBeDefined();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32); // 32 bytes for AES-256
    });

    it('should use consistent key derivation', () => {
      const key1 = encryptionService.getKey();
      const key2 = encryptionService.getKey();
      expect(key1.equals(key2)).toBe(true);
    });
  });

  describe('encrypt', () => {
    it('should encrypt text successfully', () => {
      const text = 'sensitive data';
      const encrypted = encryptionService.encrypt(text);

      expect(encrypted).toBeDefined();
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(typeof encrypted.data).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.tag).toBe('string');
    });

    it('should return null for empty text', () => {
      const result = encryptionService.encrypt(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined text', () => {
      const result = encryptionService.encrypt(undefined);
      expect(result).toBeNull();
    });

    it('should generate unique IV for each encryption', () => {
      const text = 'test data';
      const encrypted1 = encryptionService.encrypt(text);
      const encrypted2 = encryptionService.encrypt(text);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it('should handle special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encryptionService.encrypt(text);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const text = '你好世界 🌍 مرحبا';
      const encrypted = encryptionService.encrypt(text);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
    });

    it('should handle long text', () => {
      const text = 'a'.repeat(10000);
      const encrypted = encryptionService.encrypt(text);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
    });

    it('should log error on encryption failure', () => {
      // Mock crypto to throw error
      const originalCreateCipheriv = crypto.createCipheriv;
      crypto.createCipheriv = jest.fn().mockImplementation(() => {
        throw new Error('Cipher error');
      });

      expect(() => encryptionService.encrypt('test')).toThrow('Failed to encrypt data');
      expect(logger.error).toHaveBeenCalled();

      // Restore original function
      crypto.createCipheriv = originalCreateCipheriv;
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data successfully', () => {
      const originalText = 'sensitive data';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should return null for null input', () => {
      const result = encryptionService.decrypt(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = encryptionService.decrypt(undefined);
      expect(result).toBeNull();
    });

    it('should handle round trip with special characters', () => {
      const originalText = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should handle round trip with unicode', () => {
      const originalText = '你好世界 🌍 مرحبا';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should handle round trip with long text', () => {
      const originalText = 'test data '.repeat(1000);
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should throw error for tampered data', () => {
      const encrypted = encryptionService.encrypt('test');
      encrypted.data = 'tampered' + encrypted.data;

      expect(() => encryptionService.decrypt(encrypted)).toThrow('Failed to decrypt data');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error for tampered auth tag', () => {
      const encrypted = encryptionService.encrypt('test');
      encrypted.tag = 'ffffffffffffffffffffffffffffffff';

      expect(() => encryptionService.decrypt(encrypted)).toThrow('Failed to decrypt data');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error for invalid IV', () => {
      const encrypted = encryptionService.encrypt('test');
      encrypted.iv = 'invalid';

      expect(() => encryptionService.decrypt(encrypted)).toThrow('Failed to decrypt data');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('encryptUserData', () => {
    it('should encrypt all user fields', () => {
      const userData = {
        name: 'John Doe',
        location: 'San Francisco',
        experienceLevel: 'Senior',
        skills: ['JavaScript', 'Python', 'React'],
      };

      const encrypted = encryptionService.encryptUserData(userData);

      expect(encrypted.name).toBeDefined();
      expect(encrypted.name).toHaveProperty('data');
      expect(encrypted.location).toHaveProperty('data');
      expect(encrypted.experienceLevel).toHaveProperty('data');
      expect(encrypted.skills).toHaveProperty('data');
    });

    it('should handle partial user data', () => {
      const userData = {
        name: 'John Doe',
      };

      const encrypted = encryptionService.encryptUserData(userData);

      expect(encrypted.name).toBeDefined();
      expect(encrypted.name).toHaveProperty('data');
      expect(encrypted.location).toBeUndefined();
    });

    it('should handle empty user data', () => {
      const userData = {};
      const encrypted = encryptionService.encryptUserData(userData);

      expect(encrypted).toEqual({});
    });

    it('should preserve non-sensitive fields', () => {
      const userData = {
        id: 123,
        email: 'test@example.com',
        name: 'John Doe',
      };

      const encrypted = encryptionService.encryptUserData(userData);

      expect(encrypted.id).toBe(123);
      expect(encrypted.email).toBe('test@example.com');
      expect(encrypted.name).toHaveProperty('data');
    });

    it('should handle skills as array', () => {
      const userData = {
        skills: ['JavaScript', 'Python'],
      };

      const encrypted = encryptionService.encryptUserData(userData);

      expect(encrypted.skills).toBeDefined();
      expect(encrypted.skills).toHaveProperty('data');
    });

    it('should handle skills as string', () => {
      const userData = {
        skills: '["JavaScript", "Python"]',
      };

      const encrypted = encryptionService.encryptUserData(userData);

      expect(encrypted.skills).toBeDefined();
      expect(encrypted.skills).toHaveProperty('data');
    });
  });

  describe('decryptUserData', () => {
    it('should decrypt all encrypted user fields', () => {
      const userData = {
        name: 'John Doe',
        location: 'San Francisco',
        experienceLevel: 'Senior',
        skills: ['JavaScript', 'Python', 'React'],
      };

      const encrypted = encryptionService.encryptUserData(userData);
      const decrypted = encryptionService.decryptUserData(encrypted);

      expect(decrypted.name).toBe(userData.name);
      expect(decrypted.location).toBe(userData.location);
      expect(decrypted.experienceLevel).toBe(userData.experienceLevel);
      expect(decrypted.skills).toEqual(userData.skills);
    });

    it('should handle partial encrypted data', () => {
      const userData = { name: 'John Doe' };
      const encrypted = encryptionService.encryptUserData(userData);
      const decrypted = encryptionService.decryptUserData(encrypted);

      expect(decrypted.name).toBe(userData.name);
    });

    it('should preserve plain text fields', () => {
      const userData = {
        name: 'John Doe',
        email: 'plain@example.com',
      };

      const encrypted = encryptionService.encryptUserData(userData);
      const decrypted = encryptionService.decryptUserData(encrypted);

      expect(decrypted.email).toBe('plain@example.com');
    });

    it('should handle skills JSON parsing', () => {
      const userData = {
        skills: ['JavaScript', 'Python'],
      };

      const encrypted = encryptionService.encryptUserData(userData);
      const decrypted = encryptionService.decryptUserData(encrypted);

      expect(Array.isArray(decrypted.skills)).toBe(true);
      expect(decrypted.skills).toEqual(userData.skills);
    });

    it('should handle invalid JSON in skills', () => {
      const userData = { skills: 'not json' };
      const encrypted = encryptionService.encrypt(userData.skills);

      const decrypted = encryptionService.decryptUserData({
        skills: encrypted,
      });

      expect(typeof decrypted.skills).toBe('string');
      expect(decrypted.skills).toBe('not json');
    });

    it('should skip decryption for already decrypted fields', () => {
      const userData = {
        name: 'John Doe',
        location: 'San Francisco',
      };

      const decrypted = encryptionService.decryptUserData(userData);

      expect(decrypted.name).toBe(userData.name);
      expect(decrypted.location).toBe(userData.location);
    });
  });

  describe('round trip encryption', () => {
    it('should maintain data integrity through multiple encryptions', () => {
      const userData = {
        name: 'John Doe',
        location: 'San Francisco, CA',
        experienceLevel: 'Senior',
        skills: ['JavaScript', 'Python', 'React', 'Node.js'],
      };

      // First round trip
      const encrypted1 = encryptionService.encryptUserData(userData);
      const decrypted1 = encryptionService.decryptUserData(encrypted1);

      // Second round trip
      const encrypted2 = encryptionService.encryptUserData(decrypted1);
      const decrypted2 = encryptionService.decryptUserData(encrypted2);

      expect(decrypted2).toEqual(userData);
    });

    it('should handle empty strings', () => {
      const text = '';
      const encrypted = encryptionService.encrypt(text);
      // Empty string returns null
      expect(encrypted).toBeNull();
    });
  });
});
