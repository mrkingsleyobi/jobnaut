// Clerk authentication service for JobNaut
// Handles user authentication and session management with Clerk

const { createClerkClient } = require('@clerk/clerk-sdk-node');
const userService = require('../models/user');
const logger = require('../utils/logger');

/**
 * Clerk client instance
 */
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Clerk authentication service
 */
class ClerkAuthService {
  /**
   * Get Clerk client instance
   * @returns {Object} Clerk client
   */
  getClient() {
    return clerk;
  }

  /**
   * Create or get user in local database based on Clerk user data
   * @param {Object} clerkUser - Clerk user object
   * @returns {Promise<Object>} Local user object
   */
  async syncUserWithDatabase(clerkUser) {
    // Check if user already exists in our database
    let localUser = await userService.getUserByClerkId(clerkUser.id);

    if (!localUser) {
      // Create new user in our database
      localUser = await userService.createUser({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        // Additional fields can be populated later
      });
    }

    return localUser;
  }

  /**
   * Validate Clerk session token
   * @param {string} sessionToken - Session token from Clerk
   * @returns {Promise<Object|null>} Session object or null if invalid
   */
  async validateSession(sessionToken) {
    try {
      // Use the verifyToken method available in the Clerk client sessions API
      if (typeof clerk.sessions.verifySessionToken === 'function') {
        const session = await clerk.sessions.verifySessionToken(sessionToken);
        return session;
      } else {
        logger.error('Clerk client does not have verifySessionToken method');
        return null;
      }
    } catch (error) {
      logger.error('Session validation failed', { error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Get user by session token
   * @param {string} sessionToken - Session token from Clerk
   * @returns {Promise<Object|null>} User object or null if invalid
   */
  async getUserBySession(sessionToken) {
    try {
      const session = await this.validateSession(sessionToken);
      if (!session) return null;

      const clerkUser = await clerk.users.getUser(session.userId);
      const localUser = await this.syncUserWithDatabase(clerkUser);

      return {
        ...localUser,
        clerkUser,
      };
    } catch (error) {
      logger.error('Failed to get user by session', { error: error.message, stack: error.stack });
      return null;
    }
  }
}

module.exports = new ClerkAuthService();
