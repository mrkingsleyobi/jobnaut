// Saved Job model service for JobNaut
// Handles all saved job-related database operations

const prisma =
  process.env.NODE_ENV === 'test' ? require('../db/testClient') : require('../db/client');
const NodeCache = require('node-cache');
const savedJobCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

/**
 * Saved Job model service
 */
class SavedJobService {
  /**
   * Save a job for a user
   * @param {Object} savedJobData - Saved job data
   * @param {number} savedJobData.userId - User ID
   * @param {number} savedJobData.jobId - Job ID
   * @param {string} [savedJobData.notes] - Notes about the saved job
   * @param {string} [savedJobData.applicationStatus] - Application status
   * @returns {Promise<Object>} Created saved job
   */
  async saveJob(savedJobData) {
    const createdSavedJob = await prisma.savedJob.create({
      data: {
        userId: savedJobData.userId,
        jobId: savedJobData.jobId,
        notes: savedJobData.notes,
        applicationStatus: savedJobData.applicationStatus,
      },
    });

    // Invalidate cache for user's saved jobs to ensure consistency
    savedJobCache.del(`saved_jobs_${savedJobData.userId}`);

    return createdSavedJob;
  }

  /**
   * Get saved jobs for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of saved jobs
   */
  async getSavedJobsByUser(userId) {
    const cacheKey = `saved_jobs_${userId}`;
    const cached = savedJobCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId },
      include: {
        job: true, // Include job details
      },
    });

    // Cache the saved jobs
    savedJobCache.set(cacheKey, savedJobs);
    return savedJobs;
  }

  /**
   * Get a specific saved job
   * @param {number} userId - User ID
   * @param {number} jobId - Job ID
   * @returns {Promise<Object|null>} Saved job or null if not found
   */
  async getSavedJob(userId, jobId) {
    const cacheKey = `saved_job_${userId}_${jobId}`;
    const cached = savedJobCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      include: {
        job: true,
      },
    });

    // Cache the saved job
    if (savedJob) {
      savedJobCache.set(cacheKey, savedJob);
    }
    return savedJob;
  }

  /**
   * Update a saved job
   * @param {number} userId - User ID
   * @param {number} jobId - Job ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated saved job
   */
  async updateSavedJob(userId, jobId, updateData) {
    const updatedSavedJob = await prisma.savedJob.update({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      data: updateData,
    });

    // Invalidate cache for this saved job and user's saved jobs
    savedJobCache.del(`saved_job_${userId}_${jobId}`);
    savedJobCache.del(`saved_jobs_${userId}`);

    return updatedSavedJob;
  }

  /**
   * Delete a saved job
   * @param {number} userId - User ID
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Deleted saved job
   */
  async deleteSavedJob(userId, jobId) {
    const deletedSavedJob = await prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    // Invalidate cache for this saved job and user's saved jobs
    savedJobCache.del(`saved_job_${userId}_${jobId}`);
    savedJobCache.del(`saved_jobs_${userId}`);

    return deletedSavedJob;
  }
}

module.exports = new SavedJobService();
