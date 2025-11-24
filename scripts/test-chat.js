#!/usr/bin/env node

const chatService = require('./test-chat-service');

async function testChatService() {
  try {
    console.log('Testing chat service...');

    // Test clearHistory first to start fresh
    console.log('Testing clearHistory...');
    await chatService.clearHistory('test-user-1');
    console.log('History cleared successfully');

    // Test getConversationHistory (should be empty)
    console.log('Testing getConversationHistory...');
    const history = await chatService.getConversationHistory('test-user-1');
    console.log('History:', history);

    // Test sendMessage
    console.log('Testing sendMessage...');
    const response = await chatService.sendMessage('test-user-1', 'Hello, career coach!');
    console.log('Response:', response);

    // Test getConversationHistory again (should have messages now)
    console.log('Testing getConversationHistory after sending message...');
    const history2 = await chatService.getConversationHistory('test-user-1');
    console.log('History after message:', history2);

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testChatService();
