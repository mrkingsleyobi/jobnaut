// Main tRPC Router for JobNaut
// Combines all individual routers into the main app router

const { router } = require('./trpc');
const userRouter = require('./routers/user');
const jobsRouter = require('./routers/jobs');
const chatRouter = require('./routers/chat');
const skillGapRouter = require('./routers/skillGap');
const savedJobsRouter = require('./routers/savedJobs');

/**
 * Main app router
 */
const appRouter = router({
  user: userRouter,
  jobs: jobsRouter,
  chat: chatRouter,
  skillGap: skillGapRouter,
  savedJobs: savedJobsRouter,
});

// Export type router type signature
exports.AppRouter = appRouter;

module.exports = appRouter;
