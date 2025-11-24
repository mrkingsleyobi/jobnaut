// Job model service for JobNaut
// Handles all job-related database operations

const prisma =
  process.env.NODE_ENV === 'test' ? require('../db/testClient') : require('../db/client');
const cacheService = require('../services/cacheService');

/**
 * Job model service
 */
class JobService {
  /**
   * Create a new job
   * @param {Object} jobData - Job data
   * @param {string} jobData.title - Job title
   * @param {string} jobData.company - Company name
   * @param {string} jobData.location - Job location
   * @param {string} jobData.description - Job description
   * @param {Array} jobData.skills - Job skills
   * @param {Date} jobData.postedDate - Job posted date
   * @param {string} [jobData.applicationLink] - Application link
   * @returns {Promise<Object>} Created job
   */
  async createJob(jobData) {
    const createdJob = await prisma.job.create({
      data: {
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description,
        skills: JSON.stringify(jobData.skills),
        postedDate: jobData.postedDate,
        applicationLink: jobData.applicationLink,
      },
    });

    // Invalidate all search cache to ensure search results are fresh
    await cacheService.invalidate('search_*');

    return createdJob;
  }

  /**
   * Get job by ID
   * @param {number} id - Job ID
   * @returns {Promise<Object|null>} Job or null if not found
   */
  async getJobById(id) {
    const cacheKey = `job_${id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (job) {
      await cacheService.set(cacheKey, job);
    }

    return job;
  }

  /**
   * Get all jobs with pagination
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Number of jobs per page (default: 10)
   * @returns {Promise<Object>} Jobs and pagination info
   */
  async getAllJobs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Use aggregation to get both jobs and count in a single query
    const result = await prisma.job.findMany({
      skip,
      take: limit,
      orderBy: {
        postedDate: 'desc',
      },
      // Include count in the query result
    });

    // Get total count separately (Prisma doesn't support count in findMany directly)
    const total = await prisma.job.count();

    return {
      jobs: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search jobs by title, company, or location
   * @param {string} query - Search query
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Number of jobs per page (default: 10)
   * @returns {Promise<Object>} Search results and pagination info
   */
  async searchJobs(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Create cache key for search results
    const cacheKey = `search_${query}_${page}_${limit}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    // SQLite doesn't support mode: 'insensitive', only use it with PostgreSQL
    const isSQLite =
      process.env.NODE_ENV === 'test' ||
      (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:'));

    const searchConditions = {
      OR: [
        { title: { contains: query, ...(isSQLite ? {} : { mode: 'insensitive' }) } },
        { company: { contains: query, ...(isSQLite ? {} : { mode: 'insensitive' }) } },
        { location: { contains: query, ...(isSQLite ? {} : { mode: 'insensitive' }) } },
        { description: { contains: query, ...(isSQLite ? {} : { mode: 'insensitive' }) } },
      ],
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: searchConditions,
        skip,
        take: limit,
        orderBy: {
          postedDate: 'desc',
        },
      }),
      prisma.job.count({
        where: searchConditions,
      }),
    ]);

    const result = {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the search results
    await cacheService.set(cacheKey, result);

    return result;
  }

  /**
   * Update job
   * @param {number} id - Job ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated job
   */
  async updateJob(id, updateData) {
    // Convert skills array to JSON string if provided
    if (updateData.skills) {
      updateData.skills = JSON.stringify(updateData.skills);
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    // Invalidate cache for this job and all search results
    await cacheService.del(`job_${id}`);
    await cacheService.invalidate('search_*'); // Clear search cache to ensure results are fresh

    return updatedJob;
  }

  /**
   * Delete job
   * @param {number} id - Job ID
   * @returns {Promise<Object>} Deleted job
   */
  async deleteJob(id) {
    const deletedJob = await prisma.job.delete({
      where: { id },
    });

    // Invalidate cache for this job and all search results
    await cacheService.del(`job_${id}`);
    await cacheService.invalidate('search_*'); // Clear search cache to ensure results are fresh

    return deletedJob;
  }

  /**
   * Get jobs by skills
   * @param {Array} skills - Skills to match
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Number of jobs per page (default: 10)
   * @returns {Promise<Object>} Jobs and pagination info
   */
  async getJobsBySkills(skills, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Create OR conditions for each skill
    const skillConditions = skills.map((skill) => ({
      skills: {
        path: '$[*]',
        string_contains: skill,
      },
    }));

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: {
          OR: skillConditions,
        },
        skip,
        take: limit,
        orderBy: {
          postedDate: 'desc',
        },
      }),
      prisma.job.count({
        where: {
          OR: skillConditions,
        },
      }),
    ]);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

module.exports = new JobService();
