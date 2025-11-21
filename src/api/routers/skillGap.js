// Skill Gap Analysis Router for JobNaut
// Provides API endpoints for skill gap analysis functionality

const { z } = require('zod');
const { router, protectedProcedure } = require('../trpc');
const skillGapService = require('../../services/skillGapService');

// Define Zod schemas for input validation
const getSkillGapAnalysisInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobId: z.number().positive('Job ID must be a positive number'),
});

const getMultipleSkillGapAnalysesInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobIds: z
    .array(z.number().positive('Job ID must be a positive number'))
    .min(1, 'At least one job ID is required'),
});

const getOverallSkillGapAnalysisInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const skillGapRouter = router({
  /**
   * Get skill gap analysis for a specific job
   */
  getAnalysisForJob: protectedProcedure.input(getSkillGapAnalysisInput).query(async ({ input }) => {
    try {
      // In a real implementation, we would verify the user has access to this analysis
      // For now, we'll just check that the user ID matches the authenticated user
      // (this check would be done in the protectedProcedure middleware)

      const result = await skillGapService.getSkillGapAnalysisForJob(input.userId, input.jobId);

      return result;
    } catch (error) {
      console.error('Error in getAnalysisForJob:', error.message);
      throw new Error(`Failed to get skill gap analysis: ${error.message}`);
    }
  }),

  /**
   * Get skill gap analyses for multiple jobs
   */
  getAnalysisForJobs: protectedProcedure
    .input(getMultipleSkillGapAnalysesInput)
    .query(async ({ input }) => {
      try {
        const result = await skillGapService.getSkillGapAnalysisForJobs(input.userId, input.jobIds);

        return result;
      } catch (error) {
        console.error('Error in getAnalysisForJobs:', error.message);
        throw new Error(`Failed to get skill gap analyses: ${error.message}`);
      }
    }),

  /**
   * Get overall skill gap analysis for a user
   */
  getOverallAnalysis: protectedProcedure
    .input(getOverallSkillGapAnalysisInput)
    .query(async ({ input }) => {
      try {
        const result = await skillGapService.getOverallSkillGapAnalysis(input.userId);

        return result;
      } catch (error) {
        console.error('Error in getOverallAnalysis:', error.message);
        throw new Error(`Failed to get overall skill gap analysis: ${error.message}`);
      }
    }),
});

module.exports = skillGapRouter;
