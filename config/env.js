// Environment configuration for JobNaut
// Loads and validates environment variables

/**
 * Environment configuration
 */
class EnvConfig {
  constructor() {
    this.validateEnvironment();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const requiredVars = ['DATABASE_URL', 'CLERK_SECRET_KEY'];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('Warning: Missing required environment variables:', missingVars);
      console.warn('Please set these variables in your .env file or environment');
    }
  }

  /**
   * Get database URL
   * @returns {string} Database URL
   */
  getDatabaseUrl() {
    return process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/jobnaut';
  }

  /**
   * Get Clerk secret key
   * @returns {string} Clerk secret key
   */
  getClerkSecretKey() {
    return process.env.CLERK_SECRET_KEY || '';
  }

  /**
   * Get application port
   * @returns {number} Application port
   */
  getPort() {
    return parseInt(process.env.PORT) || 3000;
  }

  /**
   * Check if we're in development environment
   * @returns {boolean} True if development environment
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if we're in production environment
   * @returns {boolean} True if production environment
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  }
}

module.exports = new EnvConfig();
