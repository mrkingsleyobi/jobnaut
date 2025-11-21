/**
 * TypeScript Type Definitions for tRPC Router
 * Export this type to the frontend for end-to-end type safety
 */

import type { AppRouter } from './router';

// Re-export the AppRouter type for frontend use
export type { AppRouter };

/**
 * Usage in frontend:
 *
 * import { createTRPCReact } from '@trpc/react-query';
 * import type { AppRouter } from '../api/types';
 *
 * export const trpc = createTRPCReact<AppRouter>();
 */

/**
 * tRPC Endpoint Types Reference
 *
 * Jobs Router (jobs.*)
 * - jobs.search: Search jobs with filters
 * - jobs.getRecommended: Get personalized job recommendations (protected)
 * - jobs.getById: Get a specific job by ID
 * - jobs.getAll: Get all jobs with pagination
 *
 * User Router (user.*)
 * - user.getProfile: Get current user profile (protected)
 * - user.updateProfile: Update user profile (protected)
 * - user.addSkills: Add skills to user profile (protected)
 * - user.removeSkills: Remove skills from user profile (protected)
 *
 * Chat Router (chat.*)
 * - chat.getConversationHistory: Get chat history (protected)
 * - chat.sendMessage: Send a message to the AI chatbot (protected)
 * - chat.clearHistory: Clear conversation history (protected)
 *
 * Skill Gap Router (skillGap.*)
 * - skillGap.analyze: Analyze skill gaps for a job (protected)
 *
 * Saved Jobs Router (savedJobs.*)
 * - savedJobs.getAll: Get all saved jobs (protected)
 * - savedJobs.add: Save a job (protected)
 * - savedJobs.remove: Remove a saved job (protected)
 */

// Type guards and utility types
export type TRPCQueryKey =
  | ['jobs', 'search']
  | ['jobs', 'getRecommended']
  | ['jobs', 'getById']
  | ['jobs', 'getAll']
  | ['user', 'getProfile']
  | ['chat', 'getConversationHistory']
  | ['skillGap', 'analyze']
  | ['savedJobs', 'getAll'];

export type TRPCMutationKey =
  | ['user', 'updateProfile']
  | ['user', 'addSkills']
  | ['user', 'removeSkills']
  | ['chat', 'sendMessage']
  | ['chat', 'clearHistory']
  | ['savedJobs', 'add']
  | ['savedJobs', 'remove'];

/**
 * Error Codes
 * Standard tRPC error codes used in the API
 */
export const TRPC_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type TRPCErrorCode = typeof TRPC_ERROR_CODES[keyof typeof TRPC_ERROR_CODES];
