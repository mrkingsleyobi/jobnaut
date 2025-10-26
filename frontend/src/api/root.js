import { router } from './trpc.js';
import { savedJobsRouter } from './routers/savedJobs.js';
import { userRouter } from './routers/user.js';

// Export type router type signature
export type AppRouter = typeof appRouter;

// Main application router
export const appRouter = router({
  savedJobs: savedJobsRouter,
  user: userRouter,
});

export default appRouter;