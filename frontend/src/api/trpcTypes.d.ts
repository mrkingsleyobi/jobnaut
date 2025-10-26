// Type declarations for tRPC router
// This file provides type safety for the frontend tRPC client

declare module '../../../src/api/router' {
  import { router } from '../../../src/api/trpc';
  import userRouter from '../../../src/api/routers/user';
  import jobsRouter from '../../../src/api/routers/jobs';
  import chatRouter from '../../../src/api/routers/chat';

  export type AppRouter = typeof import('../../../src/api/router').default;

  // Re-export the router types for convenience
  export type UserRouter = typeof userRouter;
  export type JobsRouter = typeof jobsRouter;
  export type ChatRouter = typeof chatRouter;
}