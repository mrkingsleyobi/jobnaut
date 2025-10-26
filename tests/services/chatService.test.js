// Chat Service Test
// Test the chat service functionality

const chatService = require('../../src/services/chatService');

describe('Chat Service', () => {
  beforeEach(() => {
    // Clear all conversations before each test
    chatService.conversations.clear();
  });

  it('should have required methods', () => {
    expect(typeof chatService.getConversationHistory).toBe('function');
    expect(typeof chatService.sendMessage).toBe('function');
    expect(typeof chatService.clearHistory).toBe('function');
    expect(typeof chatService.generateMessageId).toBe('function');
  });

  it('should get empty conversation history for new user', async () => {
    const history = await chatService.getConversationHistory('new-user');
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  it('should send and store messages', async () => {
    const userId = 'test-user';
    const message = 'Hello, chatbot!';

    // Send a message
    const aiResponse = await chatService.sendMessage(userId, message);

    // Check that the response is valid
    expect(aiResponse).toHaveProperty('id');
    expect(aiResponse).toHaveProperty('role', 'assistant');
    expect(aiResponse).toHaveProperty('content');
    expect(aiResponse).toHaveProperty('timestamp');

    // Check that conversation history is stored
    const history = await chatService.getConversationHistory(userId);
    expect(history.length).toBe(2);
    expect(history[0]).toHaveProperty('role', 'user');
    expect(history[0]).toHaveProperty('content', message);
    expect(history[1]).toHaveProperty('role', 'assistant');
    expect(history[1].content).toBe(aiResponse.content);
  });

  it('should clear conversation history', async () => {
    const userId = 'test-user';
    const message = 'Hello, chatbot!';

    // Send a message first
    await chatService.sendMessage(userId, message);

    // Verify history exists
    let history = await chatService.getConversationHistory(userId);
    expect(history.length).toBe(2);

    // Clear history
    const result = await chatService.clearHistory(userId);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Conversation history cleared');

    // Verify history is cleared
    history = await chatService.getConversationHistory(userId);
    expect(history.length).toBe(0);
  });

  it('should generate unique message IDs', () => {
    const id1 = chatService.generateMessageId();
    const id2 = chatService.generateMessageId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
  });

  it('should generate message IDs', () => {
    const id1 = chatService.generateMessageId();
    const id2 = chatService.generateMessageId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
  });
});