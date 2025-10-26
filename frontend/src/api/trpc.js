import { initTRPC } from '@trpc/server';
import { createContext } from './context.js';

// Initialize tRPC
const t = initTRPC.context().create();

// Base router and procedure helpers
export const router = t.router;
export const middleware = t.middleware;

// Public procedure (no auth required)
export const publicProcedure = t.procedure;

// Protected procedure (auth required)
// In a real implementation, this would check authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // This is a placeholder implementation
  // In a real app, you would verify the user's authentication here

  // Mock user for demonstration
  const mockUser = {
    id: 'user123',
    email: 'user@example.com',
    name: 'Test User',
  };

  return next({
    ctx: {
      ...ctx,
      user: mockUser,
    },
  });
});