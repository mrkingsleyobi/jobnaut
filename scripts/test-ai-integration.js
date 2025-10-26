// Test script for AI integration
// Tests the chat service with both real AI providers and mock fallback

const chatService = require('../src/services/chatService');

async function testAIIntegration() {
  console.log('Testing AI Integration...');

  // Test user ID
  const userId = 'test-user-123';

  // Clear any existing conversation
  await chatService.clearHistory(userId);

  try {
    // Test 1: Send a message and get response
    console.log('\n--- Test 1: Basic Message Sending ---');
    const message1 = 'Hello, how can you help me with my job search?';
    console.log(`Sending message: ${message1}`);

    const response1 = await chatService.sendMessage(userId, message1);
    console.log(`AI Response: ${response1.content}`);

    // Test 2: Follow-up message
    console.log('\n--- Test 2: Follow-up Conversation ---');
    const message2 = 'What are some tips for networking in the tech industry?';
    console.log(`Sending message: ${message2}`);

    const response2 = await chatService.sendMessage(userId, message2);
    console.log(`AI Response: ${response2.content}`);

    // Test 3: Check conversation history
    console.log('\n--- Test 3: Conversation History ---');
    const history = await chatService.getConversationHistory(userId);
    console.log(`Conversation has ${history.length} messages`);
    history.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.role}: ${msg.content}`);
    });

    // Test 4: Clear history
    console.log('\n--- Test 4: Clear Conversation History ---');
    await chatService.clearHistory(userId);
    const clearedHistory = await chatService.getConversationHistory(userId);
    console.log(`History after clearing: ${clearedHistory.length} messages`);

    console.log('\n--- All Tests Completed Successfully ---');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAIIntegration();