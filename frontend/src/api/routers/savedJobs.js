import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';

// Import the savedJobService
import savedJobService from '../../services/savedJobService.js';

// Define Zod schemas for input validation
const getSavedJobsInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const saveJobInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  notes: z.string().optional(),
  status: z.enum(['saved', 'applied', 'interviewing', 'rejected', 'accepted']).optional(),
});

const removeSavedJobInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
});

const updateSavedJobInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  notes: z.string().optional(),
  status: z.enum(['saved', 'applied', 'interviewing', 'rejected', 'accepted']).optional(),
});

export const savedJobsRouter = router({
  /**
   * Retrieves all saved jobs for a user
   */
  getSavedJobs: protectedProcedure
    .input(getSavedJobsInput)
    .query(async ({ input }) => {
      try {
        const savedJobs = await savedJobService.getSavedJobs(input.userId);

        return {
          success: true,
          data: savedJobs,
          count: savedJobs.length,
        };
      } catch (error) {
        throw new Error(`Failed to retrieve saved jobs: ${error.message}`);
      }
    }),

  /**
   * Saves a job for a user
   */
  saveJob: protectedProcedure
    .input(saveJobInput)
    .mutation(async ({ input }) => {
      try {
        const savedJob = await savedJobService.saveJob(input);

        return {
          success: true,
          data: savedJob,
          message: 'Job saved successfully',
        };
      } catch (error) {
        throw new Error(`Failed to save job: ${error.message}`);
      }
    }),

  /**
   * Removes a saved job for a user
   */
  removeSavedJob: protectedProcedure
    .input(removeSavedJobInput)
    .mutation(async ({ input }) => {
      try {
        await savedJobService.removeSavedJob(input.userId, input.jobId);

        return {
          success: true,
          message: 'Job removed successfully',
        };
      } catch (error) {
        throw new Error(`Failed to remove saved job: ${error.message}`);
      }
    }),

  /**
   * Updates a saved job's notes or status
   */
  updateSavedJob: protectedProcedure
    .input(updateSavedJobInput)
    .mutation(async ({ input }) => {
      try {
        const updatedJob = await savedJobService.updateSavedJob(input);

        return {
          success: true,
          data: updatedJob,
          message: 'Saved job updated successfully',
        };
      } catch (error) {
        throw new Error(`Failed to update saved job: ${error.message}`);
      }
    }),
});