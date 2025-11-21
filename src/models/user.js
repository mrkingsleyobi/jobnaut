// User model service for JobNaut
// Handles all user-related database operations

const prisma =
  process.env.NODE_ENV === 'test' ? require('../db/testClient') : require('../db/client');
const encryptionService = require('../services/encryption');
const cacheService = require('../services/cacheService');

/**
 * Decrypt user fields
 * @param {Object|null} user - User object to decrypt
 * @returns {Object|null} User with decrypted fields
 */
function decryptUserFields(user) {
  if (!user) {
    return user;
  }

  const decryptedUser = {
    ...user,
    name:
      user.name && typeof user.name === 'object' ? encryptionService.decrypt(user.name) : user.name,
    location:
      user.location && typeof user.location === 'object'
        ? encryptionService.decrypt(user.location)
        : user.location,
    experienceLevel:
      user.experienceLevel && typeof user.experienceLevel === 'object'
        ? encryptionService.decrypt(user.experienceLevel)
        : user.experienceLevel,
    skills:
      user.skills && typeof user.skills === 'object'
        ? encryptionService.decrypt(user.skills)
        : user.skills,
  };

  // Parse skills JSON if it exists and is a string
  if (decryptedUser.skills && typeof decryptedUser.skills === 'string') {
    try {
      decryptedUser.skills = JSON.parse(decryptedUser.skills);
    } catch (error) {
      console.warn('Failed to parse user skills:', error);
    }
  }

  return decryptedUser;
}

/**
 * User model service
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.clerkId - Clerk user ID
   * @param {string} userData.email - User email
   * @param {string} [userData.name] - User name
   * @param {string} [userData.location] - User location
   * @param {string} [userData.experienceLevel] - User experience level
   * @param {Array} [userData.skills] - User skills
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    // Encrypt sensitive data before storing
    const encryptedData = encryptionService.encryptUserData({
      name: userData.name,
      location: userData.location,
      experienceLevel: userData.experienceLevel,
      skills: userData.skills,
    });

    return await prisma.user.create({
      data: {
        clerkId: userData.clerkId,
        email: userData.email,
        name: encryptedData.name,
        location: encryptedData.location,
        experienceLevel: encryptedData.experienceLevel,
        skills: encryptedData.skills ? JSON.stringify(encryptedData.skills) : null,
      },
    });
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserById(id) {
    const cacheKey = `user_${id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    // Decrypt sensitive data when retrieving
    const decryptedUser = decryptUserFields(user);

    if (decryptedUser) {
      // Cache the decrypted user data
      await cacheService.set(cacheKey, decryptedUser);
    }

    return decryptedUser;
  }

  /**
   * Get user by Clerk ID
   * @param {string} clerkId - Clerk user ID
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserByClerkId(clerkId) {
    const cacheKey = `user_clerk_${clerkId}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    // Decrypt sensitive data when retrieving
    const decryptedUser = decryptUserFields(user);

    if (decryptedUser) {
      // Cache the decrypted user data
      await cacheService.set(cacheKey, decryptedUser);
    }

    return decryptedUser;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserByEmail(email) {
    const cacheKey = `user_email_${email}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Decrypt sensitive data when retrieving
    const decryptedUser = decryptUserFields(user);

    if (decryptedUser) {
      // Cache the decrypted user data
      await cacheService.set(cacheKey, decryptedUser);
    }

    return decryptedUser;
  }

  /**
   * Update user profile
   * @param {number} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, updateData) {
    // Encrypt sensitive data before storing
    const encryptedData = encryptionService.encryptUserData({
      name: updateData.name,
      location: updateData.location,
      experienceLevel: updateData.experienceLevel,
      skills: updateData.skills,
    });

    // Only include fields that were provided in the update
    const dataToUpdate = {};
    if (updateData.name !== undefined) {
      dataToUpdate.name = encryptedData.name;
    }
    if (updateData.location !== undefined) {
      dataToUpdate.location = encryptedData.location;
    }
    if (updateData.experienceLevel !== undefined) {
      dataToUpdate.experienceLevel = encryptedData.experienceLevel;
    }
    if (updateData.skills !== undefined) {
      dataToUpdate.skills = encryptedData.skills ? JSON.stringify(encryptedData.skills) : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    // Decrypt sensitive data for return value
    const decryptedUser = decryptUserFields(updatedUser);

    // Invalidate cache for this user
    await cacheService.delMultiple([
      `user_${id}`,
      `user_clerk_${updatedUser.clerkId}`,
      `user_email_${updatedUser.email}`,
    ]);

    return decryptedUser;
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<Object>} Deleted user
   */
  async deleteUser(id) {
    // First get the user to invalidate cache
    const user = await prisma.user.findUnique({
      where: { id },
    });

    const deletedUser = await prisma.user.delete({
      where: { id },
    });

    // Invalidate cache for this user
    if (user) {
      await cacheService.delMultiple([
        `user_${id}`,
        `user_clerk_${user.clerkId}`,
        `user_email_${user.email}`,
      ]);
    }

    return deletedUser;
  }
}

module.exports = new UserService();
