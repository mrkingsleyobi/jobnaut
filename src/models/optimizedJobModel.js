/**
 * Optimized Job Model
 * Example of using queryOptimizer for better performance
 */

const {
  prisma,
  cachedQuery,
  queryBuilders,
  invalidateCache,
} = require('../utils/queryOptimizer');
const logger = require('../utils/logger');

/**
 * Find job by ID with caching
 */
async function findJobById(id, options = {}) {
  return cachedQuery('job', 'findUnique', {
    where: { id: parseInt(id) },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      description: true,
      skills: true,
      postedDate: true,
      applicationLink: true,
      // Only include relations if requested
      ...(options.includeSaved && {
        savedBy: {
          select: {
            userId: true,
            notes: true,
            applicationStatus: true,
          },
        },
      }),
    },
  }, { ttl: 600 }); // Cache for 10 minutes
}

/**
 * Search jobs with optimized pagination and caching
 */
async function searchJobs(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 20,
    orderBy = { postedDate: 'desc' },
  } = options;

  // Build where clause
  const where = buildJobWhereClause(filters);

  // Use query builder for optimized query
  const jobs = await queryBuilders.findJobs(where, {
    page,
    limit,
    orderBy,
    ttl: 300, // Cache for 5 minutes
  });

  // Get total count with caching
  const total = await queryBuilders.countJobs(where, { ttl: 300 });

  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Build where clause for job filtering
 */
function buildJobWhereClause(filters) {
  const where = {};

  if (filters.title) {
    where.title = {
      contains: filters.title,
      mode: 'insensitive',
    };
  }

  if (filters.company) {
    where.company = {
      contains: filters.company,
      mode: 'insensitive',
    };
  }

  if (filters.location) {
    where.location = {
      contains: filters.location,
      mode: 'insensitive',
    };
  }

  if (filters.skills && Array.isArray(filters.skills)) {
    // Search for jobs that have any of the specified skills
    where.skills = {
      path: '$',
      array_contains: filters.skills,
    };
  }

  if (filters.postedAfter) {
    where.postedDate = {
      gte: new Date(filters.postedAfter),
    };
  }

  return where;
}

/**
 * Create job (with cache invalidation)
 */
async function createJob(data) {
  try {
    const job = await prisma.job.create({
      data: {
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        skills: data.skills,
        postedDate: data.postedDate || new Date(),
        applicationLink: data.applicationLink,
      },
    });

    // Cache is automatically invalidated by middleware
    logger.info('Job created', { jobId: job.id, title: job.title });

    return job;
  } catch (error) {
    logger.error('Failed to create job', { error: error.message });
    throw error;
  }
}

/**
 * Update job (with cache invalidation)
 */
async function updateJob(id, data) {
  try {
    const job = await prisma.job.update({
      where: { id: parseInt(id) },
      data,
    });

    // Cache is automatically invalidated by middleware
    logger.info('Job updated', { jobId: job.id });

    return job;
  } catch (error) {
    logger.error('Failed to update job', { error: error.message, jobId: id });
    throw error;
  }
}

/**
 * Delete job (with cache invalidation)
 */
async function deleteJob(id) {
  try {
    await prisma.job.delete({
      where: { id: parseInt(id) },
    });

    // Cache is automatically invalidated by middleware
    logger.info('Job deleted', { jobId: id });

    return true;
  } catch (error) {
    logger.error('Failed to delete job', { error: error.message, jobId: id });
    throw error;
  }
}

/**
 * Get recent jobs with caching
 */
async function getRecentJobs(limit = 10) {
  return cachedQuery('job', 'findMany', {
    orderBy: { postedDate: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      postedDate: true,
      skills: true,
    },
  }, { ttl: 180 }); // Cache for 3 minutes
}

/**
 * Get jobs by company with caching
 */
async function getJobsByCompany(company, options = {}) {
  const { limit = 20 } = options;

  return cachedQuery('job', 'findMany', {
    where: {
      company: {
        equals: company,
        mode: 'insensitive',
      },
    },
    orderBy: { postedDate: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      location: true,
      description: true,
      skills: true,
      postedDate: true,
      applicationLink: true,
    },
  }, { ttl: 600 }); // Cache for 10 minutes
}

/**
 * Get job statistics (with heavy caching)
 */
async function getJobStats() {
  // Use longer TTL for stats as they don't need real-time accuracy
  const totalJobs = await queryBuilders.countJobs({}, { ttl: 1800 }); // 30 min

  const jobsByLocation = await prisma.job.groupBy({
    by: ['location'],
    _count: {
      location: true,
    },
    orderBy: {
      _count: {
        location: 'desc',
      },
    },
    take: 10,
  });

  const recentJobsCount = await queryBuilders.countJobs({
    postedDate: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    },
  }, { ttl: 600 });

  return {
    totalJobs,
    recentJobsCount,
    topLocations: jobsByLocation.map(item => ({
      location: item.location,
      count: item._count.location,
    })),
  };
}

/**
 * Batch fetch jobs by IDs (optimized)
 */
async function getJobsByIds(ids) {
  return queryBuilders.batchFindJobs(ids, { ttl: 300 });
}

/**
 * Force cache refresh for a specific job
 */
async function refreshJobCache(id) {
  invalidateCache('job', 'findUnique');
  return findJobById(id, { skipCache: true });
}

module.exports = {
  findJobById,
  searchJobs,
  createJob,
  updateJob,
  deleteJob,
  getRecentJobs,
  getJobsByCompany,
  getJobStats,
  getJobsByIds,
  refreshJobCache,
};
