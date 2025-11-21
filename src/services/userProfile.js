// User Profile Management Service for JobNaut
// Handles user profile CRUD operations and management

const userService = require('../models/user');
const securityLogger = require('./securityLogger');

/**
 * User Profile Management Service
 */
class UserProfileService {
  /**
   * Get user profile (alias for getProfile)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(userId) {
    return this.getProfile(userId);
  }

  /**
   * Get user profile
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getProfile(userId) {
    // Log data access event
    securityLogger.logDataAccess('user_profile', {
      userId: userId,
      action: 'read',
    });

    const user = await userService.getUserById(userId);

    if (!user) {
      // Log failed access attempt
      securityLogger.logAccessControl('user_profile', 'read', {
        userId: userId,
        allowed: false,
        reason: 'User not found',
      });
      throw new Error('User not found');
    }

    // Log successful access
    securityLogger.logAccessControl('user_profile', 'read', {
      userId: userId,
      targetUserId: user.id,
      allowed: true,
    });

    // The user service now handles decryption, so we can return the user directly
    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      location: user.location,
      experienceLevel: user.experienceLevel,
      skills: user.skills || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(userId, profileData) {
    // Log data access event
    securityLogger.logDataAccess('user_profile', {
      userId: userId,
      action: 'update',
      fields: Object.keys(profileData),
    });

    // Validate and sanitize input data
    const updateData = {};

    if (profileData.name !== undefined) {
      updateData.name = profileData.name;
    }

    if (profileData.location !== undefined) {
      updateData.location = profileData.location;
    }

    if (profileData.experienceLevel !== undefined) {
      updateData.experienceLevel = profileData.experienceLevel;
    }

    if (profileData.skills !== undefined) {
      // Validate skills is an array
      if (Array.isArray(profileData.skills)) {
        updateData.skills = profileData.skills;
      } else {
        securityLogger.logSuspiciousActivity('invalid_input', {
          userId: userId,
          field: 'skills',
          reason: 'Skills must be an array',
          providedType: typeof profileData.skills,
        });
        throw new Error('Skills must be an array');
      }
    }

    try {
      const updatedUser = await userService.updateUser(userId, updateData);

      // Log successful update
      securityLogger.logAccessControl('user_profile', 'update', {
        userId: userId,
        targetUserId: updatedUser.id,
        allowed: true,
        fields: Object.keys(updateData),
      });

      return {
        id: updatedUser.id,
        clerkId: updatedUser.clerkId,
        email: updatedUser.email,
        name: updatedUser.name,
        location: updatedUser.location,
        experienceLevel: updatedUser.experienceLevel,
        skills: updatedUser.skills || [],
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      // Log failed update attempt
      securityLogger.logAccessControl('user_profile', 'update', {
        userId: userId,
        allowed: false,
        reason: error.message,
      });
      throw error;
    }
  }

  /**
   * Add skills to user profile
   * @param {number} userId - User ID
   * @param {Array} newSkills - Array of new skills to add
   * @returns {Promise<Object>} Updated user profile
   */
  async addSkills(userId, newSkills) {
    // Log data access event
    securityLogger.logDataAccess('user_skills', {
      userId: userId,
      action: 'add',
      skillsCount: newSkills ? newSkills.length : 0,
    });

    // Get current user profile
    const currentUser = await userService.getUserById(userId);

    if (!currentUser) {
      securityLogger.logAccessControl('user_skills', 'add', {
        userId: userId,
        allowed: false,
        reason: 'User not found',
      });
      throw new Error('User not found');
    }

    // Merge and deduplicate skills
    const allSkills = [...new Set([...(currentUser.skills || []), ...newSkills])];

    // Update user with new skills
    const updatedUser = await userService.updateUser(userId, {
      skills: allSkills,
    });

    // Log successful update
    securityLogger.logAccessControl('user_skills', 'add', {
      userId: userId,
      targetUserId: updatedUser.id,
      allowed: true,
      skillsCount: allSkills.length,
    });

    return {
      id: updatedUser.id,
      clerkId: updatedUser.clerkId,
      email: updatedUser.email,
      name: updatedUser.name,
      location: updatedUser.location,
      experienceLevel: updatedUser.experienceLevel,
      skills: allSkills,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Remove skills from user profile
   * @param {number} userId - User ID
   * @param {Array} skillsToRemove - Array of skills to remove
   * @returns {Promise<Object>} Updated user profile
   */
  async removeSkills(userId, skillsToRemove) {
    // Log data access event
    securityLogger.logDataAccess('user_skills', {
      userId: userId,
      action: 'remove',
      skillsCount: skillsToRemove ? skillsToRemove.length : 0,
    });

    // Get current user profile
    const currentUser = await userService.getUserById(userId);

    if (!currentUser) {
      securityLogger.logAccessControl('user_skills', 'remove', {
        userId: userId,
        allowed: false,
        reason: 'User not found',
      });
      throw new Error('User not found');
    }

    // Remove specified skills
    const updatedSkills = (currentUser.skills || []).filter(
      (skill) => !skillsToRemove.includes(skill)
    );

    // Update user with new skills
    const updatedUser = await userService.updateUser(userId, {
      skills: updatedSkills,
    });

    // Log successful update
    securityLogger.logAccessControl('user_skills', 'remove', {
      userId: userId,
      targetUserId: updatedUser.id,
      allowed: true,
      skillsCount: updatedSkills.length,
    });

    return {
      id: updatedUser.id,
      clerkId: updatedUser.clerkId,
      email: updatedUser.email,
      name: updatedUser.name,
      location: updatedUser.location,
      experienceLevel: updatedUser.experienceLevel,
      skills: updatedSkills,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}

module.exports = new UserProfileService();
