// tRPC Jobs Router for JobNaut
// Handles job-related tRPC procedures

const { z } = require('zod');
const { router, publicProcedure, protectedProcedure } = require('../trpc');
const jobService = require('../../services/jobService');

/**
 * Jobs router with tRPC procedures
 */
const jobsRouter = router({
  // Search jobs with filters
  search: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      location: z.string().optional(),
      remote: z.boolean().optional(),
      experienceLevel: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }))
    .query(async ({ input }) => {
      try {
        // Use job service to search jobs
        const searchParams = {
          query: input.query || '',
          location: input.location,
          remote: input.remote,
          experience_level: input.experienceLevel,
          limit: input.limit || 10,
          offset: input.offset || 0
        };

        // For now, we'll search in the database
        // In production, this would use Meilisearch
        const result = await jobService.searchJobs(
          searchParams.query,
          Math.floor(searchParams.offset / searchParams.limit) + 1,
          searchParams.limit
        );

        // Format jobs for response
        const formattedJobs = result.jobs.map(job => {
          let skills = [];
          if (job.skills) {
            try {
              skills = typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills;
            } catch (e) {
              skills = [];
            }
          }

          return {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            skills: skills,
            postedDate: job.postedDate instanceof Date ? job.postedDate.toISOString() : job.postedDate,
            applicationLink: job.applicationLink,
          };
        });

        return {
          jobs: formattedJobs,
          totalCount: result.total,
        };
      } catch (error) {
        console.error('Error searching jobs:', error);
        return {
          jobs: [],
          totalCount: 0,
        };
      }
    }),

  // Get recommended jobs for user
  getRecommended: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Get user ID from context (authenticated user)
        const userId = ctx.user?.id;

        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Get user's skills from their profile
        // In a real implementation, this would come from the user service
        const userSkills = []; // This would be fetched from user profile

        // Get job recommendations using job service
        const recommendedJobs = await jobService.getJobRecommendations(userId, userSkills);

        // Format jobs for response
        const formattedJobs = recommendedJobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: job.skills || [],
          postedDate: job.postedDate,
          applicationLink: job.applicationLink,
          matchScore: job.matchScore || 0
        }));

        return formattedJobs;
      } catch (error) {
        console.error('Error getting recommended jobs:', error);
        return [];
      }
    }),

  // Get job by ID
  getById: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        // Get job by ID using job service
        const job = await jobService.getJobById(input.id);

        if (!job) {
          throw new Error('Job not found');
        }

        // Format job for response
        let skills = [];
        if (job.skills) {
          try {
            skills = typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills;
          } catch (e) {
            skills = [];
          }
        }

        return {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: skills,
          postedDate: job.postedDate instanceof Date ? job.postedDate.toISOString() : job.postedDate,
          applicationLink: job.applicationLink,
        };
      } catch (error) {
        console.error('Error getting job by ID:', error);
        throw new Error('Job not found');
      }
    }),
});

module.exports = jobsRouter;