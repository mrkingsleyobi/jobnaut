// tRPC User Router for JobNaut
// Handles user-related tRPC procedures

const { z } = require('zod');
const { router, publicProcedure, protectedProcedure } = require('../trpc');
const userProfileService = require('../../services/userProfile');
const userService = require('../../models/user');

/**
 * User router with tRPC procedures
 */
const userRouter = router({
  // Get current user profile (protected)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // Use the real user profile service to get the user's profile
    return await userProfileService.getProfile(ctx.user.id);
  }),

  // Update user profile (protected)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        location: z.string().optional(),
        experienceLevel: z.string().optional(),
        skills: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Use the real user profile service to update the user's profile
      const updatedProfile = await userProfileService.updateProfile(ctx.user.id, input);
      return {
        success: true,
        profile: updatedProfile,
      };
    }),

  // Add skills to user profile (protected)
  addSkills: protectedProcedure
    .input(
      z.object({
        skills: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Use the real user profile service to add skills to the user's profile
      const updatedProfile = await userProfileService.addSkills(ctx.user.id, input.skills);
      return {
        success: true,
        profile: updatedProfile,
      };
    }),

  // Remove skills from user profile (protected)
  removeSkills: protectedProcedure
    .input(
      z.object({
        skills: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Use the real user profile service to remove skills from the user's profile
      const updatedProfile = await userProfileService.removeSkills(ctx.user.id, input.skills);
      return {
        success: true,
        profile: updatedProfile,
      };
    }),
});

module.exports = userRouter;
