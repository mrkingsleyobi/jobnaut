// tRPC setup for JobNaut
// Configures tRPC context, procedures, and middleware

const { initTRPC } = require('@trpc/server');
const { z } = require('zod');
const userProfileService = require('../services/userProfile');

// Initialize tRPC
const t = initTRPC.create();

// Base router and procedure helpers
const router = t.router;
const publicProcedure = t.procedure;

/**
 * Create tRPC context
 * @param {Object} opts - Request options
 * @returns {Object} Context object
 */
const createContext = async (opts) => {
  // Extract user from request (set by auth middleware)
  const user = opts?.req?.user;

  return {
    user: user || null,
  };
};

/**
 * Auth middleware for protected procedures
 */
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // Check if user is authenticated
  if (!ctx.user) {
    throw new Error('Unauthorized: Authentication required');
  }

  // In a real implementation, you would validate the user session
  // For now, we'll allow authenticated requests through

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Protected procedure (requires authentication)
const protectedProcedure = publicProcedure.use(authMiddleware);

module.exports = {
  router,
  publicProcedure,
  protectedProcedure,
  createContext,
};
