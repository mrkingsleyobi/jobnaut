// Chat Router Test
// Test the chat router functionality

const chatRouter = require('../../../src/api/routers/chat');

describe('Chat Router', () => {
  it('should have getConversationHistory procedure', () => {
    expect(chatRouter._def.queries.getConversationHistory).toBeDefined();
  });

  it('should have sendMessage procedure', () => {
    expect(chatRouter._def.mutations.sendMessage).toBeDefined();
  });

  it('should have clearHistory procedure', () => {
    expect(chatRouter._def.mutations.clearHistory).toBeDefined();
  });

  it('should have proper input validation for sendMessage', () => {
    const sendMessageProcedure = chatRouter._def.mutations.sendMessage;
    expect(sendMessageProcedure).toBeDefined();

    // Check that it has input validation
    expect(sendMessageProcedure._def.inputs).toBeDefined();
  });
});