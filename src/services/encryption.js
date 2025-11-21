// Encryption service for JobNaut
// Handles encryption and decryption of sensitive user data

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Encryption service for sensitive data
 */
class EncryptionService {
  constructor() {
    // In a production environment, this key should be stored securely in environment variables
    // and rotated regularly. For development, we're using a placeholder.
    this.algorithm = 'aes-256-gcm';
    this.key = this.getKey();
  }

  /**
   * Get encryption key from environment or generate a development key
   * @returns {Buffer} Encryption key
   */
  getKey() {
    const key = process.env.ENCRYPTION_KEY || 'jobnaut_development_encryption_key_32bytes!';
    // Ensure key is 32 bytes for aes-256-gcm
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encrypt(text) {
    if (!text) return null;

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        data: encrypted,
        iv: iv.toString('hex'),
        tag: authTag.toString('hex'),
      };
    } catch (error) {
      logger.error('Encryption error', { error: error.message, stack: error.stack });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data with IV and auth tag
   * @returns {string} Decrypted text
   */
  decrypt(encryptedData) {
    if (!encryptedData) return null;

    try {
      const { data, iv, tag } = encryptedData;
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error', { error: error.message, stack: error.stack });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt user sensitive data
   * @param {Object} userData - User data to encrypt
   * @returns {Object} User data with encrypted fields
   */
  encryptUserData(userData) {
    const encryptedData = { ...userData };

    // Encrypt sensitive fields
    if (userData.name) {
      encryptedData.name = this.encrypt(userData.name);
    }

    if (userData.location) {
      encryptedData.location = this.encrypt(userData.location);
    }

    if (userData.experienceLevel) {
      encryptedData.experienceLevel = this.encrypt(userData.experienceLevel);
    }

    // Skills are already stored as JSON, so we encrypt the string representation
    if (userData.skills) {
      const skillsString = Array.isArray(userData.skills)
        ? JSON.stringify(userData.skills)
        : userData.skills;
      encryptedData.skills = this.encrypt(skillsString);
    }

    return encryptedData;
  }

  /**
   * Decrypt user sensitive data
   * @param {Object} encryptedUserData - Encrypted user data
   * @returns {Object} User data with decrypted fields
   */
  decryptUserData(encryptedUserData) {
    const decryptedData = { ...encryptedUserData };

    // Decrypt sensitive fields
    if (encryptedUserData.name && typeof encryptedUserData.name === 'object') {
      decryptedData.name = this.decrypt(encryptedUserData.name);
    }

    if (encryptedUserData.location && typeof encryptedUserData.location === 'object') {
      decryptedData.location = this.decrypt(encryptedUserData.location);
    }

    if (
      encryptedUserData.experienceLevel &&
      typeof encryptedUserData.experienceLevel === 'object'
    ) {
      decryptedData.experienceLevel = this.decrypt(encryptedUserData.experienceLevel);
    }

    // Decrypt skills
    if (encryptedUserData.skills && typeof encryptedUserData.skills === 'object') {
      const decryptedSkills = this.decrypt(encryptedUserData.skills);
      try {
        decryptedData.skills = JSON.parse(decryptedSkills);
      } catch (error) {
        // If parsing fails, keep as string
        decryptedData.skills = decryptedSkills;
      }
    }

    return decryptedData;
  }
}

module.exports = new EncryptionService();
