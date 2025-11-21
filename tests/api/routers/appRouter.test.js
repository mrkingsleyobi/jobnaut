// App Router Integration Test
// Test that all routers are properly integrated

const appRouter = require('../../../src/api/router');

describe('App Router Integration', () => {
  it('should have user router', () => {
    expect(appRouter._def.record.user).toBeDefined();
  });

  it('should have jobs router', () => {
    expect(appRouter._def.record.jobs).toBeDefined();
  });

  it('should have chat router', () => {
    expect(appRouter._def.record.chat).toBeDefined();
  });

  it('should have all expected chat procedures', () => {
    const chatRouter = appRouter._def.record.chat;
    expect(chatRouter._def.queries.getConversationHistory).toBeDefined();
    expect(chatRouter._def.mutations.sendMessage).toBeDefined();
    expect(chatRouter._def.mutations.clearHistory).toBeDefined();
  });
});
