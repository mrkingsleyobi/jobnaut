// tRPC HTTP Server for JobNaut
// Handles tRPC requests over HTTP

const { createContext } = require('./trpc');
const appRouter = require('./router');
const { createExpressMiddleware } = require('@trpc/server/adapters/express');

/**
 * Create tRPC Express middleware
 */
const createTRPCExpressMiddleware = () => {
  return createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, path, input, ctx, type }) => {
      console.error(`tRPC Error on path ${path}:`, error);
    },
  });
};

module.exports = {
  createTRPCExpressMiddleware,
};
