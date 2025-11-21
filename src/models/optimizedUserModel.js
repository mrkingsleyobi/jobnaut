/**
 * Optimized User Model
 * Example of using queryOptimizer for user operations
 */

const {
  prisma,
  cachedQuery,
  queryBuilders,
} = require('../utils/queryOptimizer');
const logger = require('../utils/logger');

/**
 * Find user by Clerk ID with caching
 */
async function findUserByClerkId(clerkId) {
  return queryBuilders.findUser(
    { clerkId },
    { ttl: 300 } // Cache for 5 minutes
  );
}

/**
 * Find user by email with caching
 */
async function findUserByEmail(email) {
  return cachedQuery('user', 'findUnique', {
    where: { email },
    select: {
      id: true,
      clerkId: true,
      email: true,
      name: true,
      location: true,
      experienceLevel: true,
      skills: true,
      createdAt: true,
    },
  }, { ttl: 300 });
}

/**
 * Get user with saved jobs (selective include)
 */
async function getUserWithSavedJobs(userId, options = {}) {
  const { limit = 10, includeJobDetails = false } = options;

  return cachedQuery('user', 'findUnique', {
    where: { id: parseInt(userId) },
    select: {
      id: true,
      name: true,
      email: true,
      savedJobs: {
        take: limit,
        orderBy: { savedAt: 'desc' },
        select: {
          id: true,
          notes: true,
          applicationStatus: true,
          savedAt: true,
          // Conditionally include job details
          ...(includeJobDetails && {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                postedDate: true,
              },
            },
          }),
        },
      },
    },
  }, { ttl: 60 }); // Short cache for user-specific data
}

/**
 * Get user's conversations with messages
 */
async function getUserConversations(userId, options = {}) {
  const { limit = 10, includeMessages = false } = options;

  return cachedQuery('user', 'findUnique', {
    where: { id: parseInt(userId) },
    select: {
      id: true,
      conversations: {
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          // Only include messages if requested
          ...(includeMessages && {
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
              },
            },
          }),
        },
      },
    },
  }, { ttl: 30 }); // Very short cache for conversations
}

/**
 * Create user (no caching for mutations)
 */
async function createUser(data) {
  try {
    const user = await prisma.user.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        name: data.name,
        location: data.location,
        experienceLevel: data.experienceLevel,
        skills: data.skills,
      },
    });

    logger.info('User created', { userId: user.id, email: user.email });

    return user;
  } catch (error) {
    logger.error('Failed to create user', { error: error.message });
    throw error;
  }
}

/**
 * Update user profile
 */
async function updateUserProfile(userId, data) {
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data,
    });

    logger.info('User profile updated', { userId: user.id });

    return user;
  } catch (error) {
    logger.error('Failed to update user profile', { error: error.message });
    throw error;
  }
}

/**
 * Get user activity history (with pagination)
 */
async function getUserActivity(userId, options = {}) {
  const { page = 1, limit = 20, action = null } = options;

  const where = {
    userId: parseInt(userId),
    ...(action && { action }),
  };

  const activities = await cachedQuery('userActivity', 'findMany', {
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
    },
  }, { ttl: 120 }); // Cache for 2 minutes

  return activities;
}

/**
 * Track user activity (no caching)
 */
async function trackActivity(userId, action, metadata = null) {
  try {
    const activity = await prisma.userActivity.create({
      data: {
        userId: parseInt(userId),
        action,
        metadata,
      },
    });

    logger.debug('Activity tracked', { userId, action });

    return activity;
  } catch (error) {
    logger.error('Failed to track activity', { error: error.message });
    // Don't throw - activity tracking shouldn't break main flow
    return null;
  }
}

/**
 * Get user skill gap analyses
 */
async function getUserSkillGapAnalyses(userId, options = {}) {
  const { limit = 10 } = options;

  return cachedQuery('skillGapAnalysis', 'findMany', {
    where: { userId: parseInt(userId) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      matchingSkills: true,
      missingSkills: true,
      matchPercentage: true,
      recommendations: true,
      createdAt: true,
      job: {
        select: {
          id: true,
          title: true,
          company: true,
        },
      },
    },
  }, { ttl: 300 });
}

/**
 * Create skill gap analysis
 */
async function createSkillGapAnalysis(data) {
  try {
    const analysis = await prisma.skillGapAnalysis.create({
      data: {
        userId: parseInt(data.userId),
        jobId: parseInt(data.jobId),
        matchingSkills: data.matchingSkills,
        missingSkills: data.missingSkills,
        matchPercentage: data.matchPercentage,
        recommendations: data.recommendations,
      },
    });

    logger.info('Skill gap analysis created', {
      userId: data.userId,
      jobId: data.jobId,
      matchPercentage: data.matchPercentage,
    });

    return analysis;
  } catch (error) {
    logger.error('Failed to create skill gap analysis', { error: error.message });
    throw error;
  }
}

/**
 * Get user statistics
 */
async function getUserStats(userId) {
  const user = await findUserByClerkId(userId);

  if (!user) {
    return null;
  }

  // Use parallel queries for better performance
  const [savedJobsCount, conversationsCount, activitiesCount, recentActivity] = await Promise.all([
    prisma.savedJob.count({ where: { userId: user.id } }),
    prisma.conversation.count({ where: { userId: user.id } }),
    prisma.userActivity.count({ where: { userId: user.id } }),
    getUserActivity(user.id, { limit: 5 }),
  ]);

  return {
    userId: user.id,
    savedJobsCount,
    conversationsCount,
    activitiesCount,
    recentActivity,
    memberSince: user.createdAt,
  };
}

module.exports = {
  findUserByClerkId,
  findUserByEmail,
  getUserWithSavedJobs,
  getUserConversations,
  createUser,
  updateUserProfile,
  getUserActivity,
  trackActivity,
  getUserSkillGapAnalyses,
  createSkillGapAnalysis,
  getUserStats,
};
