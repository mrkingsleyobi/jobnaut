// tRPC SavedJobs Router for JobNaut
// Handles saved job-related tRPC procedures

const { z } = require('zod');
const { router, publicProcedure, protectedProcedure } = require('../trpc');
const savedJobService = require('../../models/savedJob');

/**
 * Validation schemas for saved jobs
 */
const saveJobSchema = z.object({
  jobId: z.number().int().positive('Job ID must be a positive integer'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  applicationStatus: z
    .enum(['not_applied', 'applied', 'interviewing', 'offer', 'rejected'])
    .optional()
    .default('not_applied'),
});

const updateNotesSchema = z.object({
  jobId: z.number().int().positive('Job ID must be a positive integer'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters'),
});

const unsaveJobSchema = z.object({
  jobId: z.number().int().positive('Job ID must be a positive integer'),
});

const checkIfSavedSchema = z.object({
  jobId: z.number().int().positive('Job ID must be a positive integer'),
});

/**
 * SavedJobs router with tRPC procedures
 */
const savedJobsRouter = router({
  /**
   * Get all saved jobs for the authenticated user
   * Returns saved jobs with full job details
   */
  getUserSavedJobs: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;

      // Get saved jobs with job details
      const savedJobs = await savedJobService.getSavedJobsByUser(userId);

      // Format response
      const formattedSavedJobs = savedJobs.map((savedJob) => {
        let skills = [];
        if (savedJob.job && savedJob.job.skills) {
          try {
            skills =
              typeof savedJob.job.skills === 'string'
                ? JSON.parse(savedJob.job.skills)
                : savedJob.job.skills;
          } catch (e) {
            skills = [];
          }
        }

        return {
          id: savedJob.id,
          userId: savedJob.userId,
          jobId: savedJob.jobId,
          notes: savedJob.notes,
          applicationStatus: savedJob.applicationStatus,
          savedAt: savedJob.savedAt || savedJob.createdAt,
          job: savedJob.job
            ? {
                id: savedJob.job.id,
                title: savedJob.job.title,
                company: savedJob.job.company,
                location: savedJob.job.location,
                description: savedJob.job.description,
                skills: skills,
                postedDate:
                  savedJob.job.postedDate instanceof Date
                    ? savedJob.job.postedDate.toISOString()
                    : savedJob.job.postedDate,
                applicationLink: savedJob.job.applicationLink,
              }
            : null,
        };
      });

      return {
        savedJobs: formattedSavedJobs,
        totalCount: formattedSavedJobs.length,
      };
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      throw new Error('Failed to retrieve saved jobs');
    }
  }),

  /**
   * Save a job for the authenticated user
   * Allows user to add notes and application status
   */
  saveJob: protectedProcedure.input(saveJobSchema).mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Check if job is already saved
      const existingSavedJob = await savedJobService.getSavedJob(userId, input.jobId);

      if (existingSavedJob) {
        throw new Error('Job is already saved');
      }

      // Save the job
      const savedJob = await savedJobService.saveJob({
        userId,
        jobId: input.jobId,
        notes: input.notes || null,
        applicationStatus: input.applicationStatus || 'not_applied',
      });

      return {
        success: true,
        message: 'Job saved successfully',
        savedJob: {
          id: savedJob.id,
          jobId: savedJob.jobId,
          userId: savedJob.userId,
          notes: savedJob.notes,
          applicationStatus: savedJob.applicationStatus,
          savedAt: savedJob.savedAt || savedJob.createdAt,
        },
      };
    } catch (error) {
      console.error('Error saving job:', error);
      throw new Error(error.message || 'Failed to save job');
    }
  }),

  /**
   * Remove a saved job for the authenticated user
   */
  unsaveJob: protectedProcedure.input(unsaveJobSchema).mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Check if job is saved
      const existingSavedJob = await savedJobService.getSavedJob(userId, input.jobId);

      if (!existingSavedJob) {
        throw new Error('Job is not saved');
      }

      // Delete the saved job
      await savedJobService.deleteSavedJob(userId, input.jobId);

      return {
        success: true,
        message: 'Job removed from saved jobs',
      };
    } catch (error) {
      console.error('Error removing saved job:', error);
      throw new Error(error.message || 'Failed to remove saved job');
    }
  }),

  /**
   * Update notes on a saved job
   */
  updateNotes: protectedProcedure.input(updateNotesSchema).mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Check if job is saved
      const existingSavedJob = await savedJobService.getSavedJob(userId, input.jobId);

      if (!existingSavedJob) {
        throw new Error('Job is not saved');
      }

      // Update the notes
      const updatedSavedJob = await savedJobService.updateSavedJob(userId, input.jobId, {
        notes: input.notes,
      });

      return {
        success: true,
        message: 'Notes updated successfully',
        savedJob: {
          id: updatedSavedJob.id,
          jobId: updatedSavedJob.jobId,
          userId: updatedSavedJob.userId,
          notes: updatedSavedJob.notes,
          applicationStatus: updatedSavedJob.applicationStatus,
        },
      };
    } catch (error) {
      console.error('Error updating notes:', error);
      throw new Error(error.message || 'Failed to update notes');
    }
  }),

  /**
   * Check if a specific job is saved by the authenticated user
   */
  checkIfSaved: protectedProcedure.input(checkIfSavedSchema).query(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Check if job is saved
      const savedJob = await savedJobService.getSavedJob(userId, input.jobId);

      return {
        isSaved: !!savedJob,
        savedJob: savedJob
          ? {
              id: savedJob.id,
              notes: savedJob.notes,
              applicationStatus: savedJob.applicationStatus,
              savedAt: savedJob.savedAt || savedJob.createdAt,
            }
          : null,
      };
    } catch (error) {
      console.error('Error checking if job is saved:', error);
      throw new Error('Failed to check saved status');
    }
  }),
});

module.exports = savedJobsRouter;
