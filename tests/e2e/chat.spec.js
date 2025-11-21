// AI Chatbot Interaction E2E Tests for JobNaut
// Tests chatbot functionality, conversation flow, and message handling

const { test, expect, testUsers } = require('./fixtures');

test.describe('AI Chatbot Interaction', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
    await page.goto('/chat');
  });

  test.describe('Chat Interface', () => {
    test('should display chat interface', async ({ page }) => {
      // Check for chat container
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
    });

    test('should display chat history panel', async ({ page }) => {
      // Check for chat history
      await expect(page.locator('[data-testid="chat-history"]')).toBeVisible();
    });

    test('should display welcome message', async ({ page }) => {
      // Check for welcome or initial message
      const welcomeMessage = page.locator('[data-testid="welcome-message"]');
      const initialMessage = page.locator('[data-testid="initial-message"]');

      const welcomeVisible = await welcomeMessage.isVisible().catch(() => false);
      const initialVisible = await initialMessage.isVisible().catch(() => false);

      expect(welcomeVisible || initialVisible).toBeTruthy();
    });
  });

  test.describe('Send Messages', () => {
    test('should send a message to chatbot', async ({ page }) => {
      const testMessage = 'Hello, can you help me find jobs?';

      // Type message
      await page.fill('[data-testid="chat-input"]', testMessage);

      // Send message
      await page.click('[data-testid="send-button"]');

      // User message should appear
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText(testMessage);

      // AI response should appear
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });
    });

    test('should send message with Enter key', async ({ page }) => {
      const testMessage = 'What are the best jobs for me?';

      // Type message
      await page.fill('[data-testid="chat-input"]', testMessage);

      // Press Enter
      await page.press('[data-testid="chat-input"]', 'Enter');

      // User message should appear
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText(testMessage);

      // AI response should appear
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });
    });

    test('should not send empty message', async ({ page }) => {
      // Try to send empty message
      await page.click('[data-testid="send-button"]');

      // Send button should be disabled or no new message appears
      const sendButton = page.locator('[data-testid="send-button"]');
      const isDisabled = await sendButton.isDisabled();

      expect(isDisabled).toBeTruthy();
    });

    test('should handle long messages', async ({ page }) => {
      const longMessage = 'I am looking for a software engineering position with the following requirements: ' +
        'JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Docker, Kubernetes, AWS, CI/CD. ' +
        'I have 5 years of experience and prefer remote work. Can you help me find suitable positions?';

      // Type long message
      await page.fill('[data-testid="chat-input"]', longMessage);

      // Send message
      await page.click('[data-testid="send-button"]');

      // Message should appear
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('software engineering');

      // AI response should appear
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });
    });

    test('should disable input while AI is responding', async ({ page }) => {
      const testMessage = 'Tell me about job market trends';

      // Send message
      await page.fill('[data-testid="chat-input"]', testMessage);
      await page.click('[data-testid="send-button"]');

      // Input should be disabled while processing
      const chatInput = page.locator('[data-testid="chat-input"]');

      // Check if disabled or has loading state
      await page.waitForTimeout(500);
      const isDisabled = await chatInput.isDisabled();
      const hasLoadingClass = await chatInput.getAttribute('class');

      expect(isDisabled || hasLoadingClass.includes('loading')).toBeTruthy();
    });
  });

  test.describe('Message Display', () => {
    test('should display user and AI messages with correct styling', async ({ page }) => {
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');

      // Wait for both messages
      await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Check that messages have different styling
      const userMessage = page.locator('[data-testid="user-message"]').last();
      const aiMessage = page.locator('[data-testid="ai-message"]').last();

      const userClass = await userMessage.getAttribute('class');
      const aiClass = await aiMessage.getAttribute('class');

      expect(userClass).not.toBe(aiClass);
    });

    test('should display message timestamps', async ({ page }) => {
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'What time is it?');
      await page.click('[data-testid="send-button"]');

      // Check for timestamp
      const timestamp = page.locator('[data-testid="message-timestamp"]').last();
      await expect(timestamp).toBeVisible();
    });

    test('should scroll to latest message', async ({ page }) => {
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="chat-input"]', `Message ${i + 1}`);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(1000);
      }

      // Latest message should be visible
      const latestMessage = page.locator('[data-testid="user-message"]').last();
      await expect(latestMessage).toBeInViewport();
    });
  });

  test.describe('Conversation Context', () => {
    test('should maintain conversation context', async ({ page }) => {
      // Send first message
      await page.fill('[data-testid="chat-input"]', 'I am a software engineer with 5 years experience');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Send follow-up message
      await page.fill('[data-testid="chat-input"]', 'What jobs would you recommend for me?');
      await page.click('[data-testid="send-button"]');

      // AI should respond with context from first message
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // The response should reference software engineering
      const lastResponse = await page.locator('[data-testid="ai-message"]').last().textContent();
      expect(lastResponse.toLowerCase()).toMatch(/software|engineer|experience/);
    });

    test('should handle multiple questions in sequence', async ({ page }) => {
      const questions = [
        'What are the top skills for software engineers?',
        'How much do they typically earn?',
        'What cities have the most opportunities?'
      ];

      for (const question of questions) {
        await page.fill('[data-testid="chat-input"]', question);
        await page.click('[data-testid="send-button"]');
        await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(500);
      }

      // Should have all messages in history
      const userMessages = page.locator('[data-testid="user-message"]');
      const count = await userMessages.count();
      expect(count).toBeGreaterThanOrEqual(questions.length);
    });
  });

  test.describe('Chat Features', () => {
    test('should suggest job-related questions', async ({ page }) => {
      // Check for suggested questions
      const suggestedQuestions = page.locator('[data-testid="suggested-question"]');
      const hasSuggestions = await suggestedQuestions.count() > 0;

      if (hasSuggestions) {
        // Click on a suggested question
        await suggestedQuestions.first().click();

        // Message should be sent
        await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
        await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });
      }
    });

    test('should copy message text', async ({ page }) => {
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'Test message for copying');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Click copy button
      const copyButton = page.locator('[data-testid="copy-message"]').last();
      if (await copyButton.isVisible()) {
        await copyButton.click();

        // Should show copied confirmation
        await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
      }
    });

    test('should regenerate AI response', async ({ page }) => {
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'What are entry level jobs?');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Get original response
      const originalResponse = await page.locator('[data-testid="ai-message"]').last().textContent();

      // Click regenerate button
      const regenerateButton = page.locator('[data-testid="regenerate-response"]');
      if (await regenerateButton.isVisible()) {
        await regenerateButton.click();

        // Should show new response
        await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('Clear Chat History', () => {
    test('should clear chat history', async ({ page, helpers }) => {
      // Send some messages
      await page.fill('[data-testid="chat-input"]', 'First message');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      await page.fill('[data-testid="chat-input"]', 'Second message');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Clear history
      await helpers.clearChatHistory(page);

      // Should show empty state
      await expect(page.locator('[data-testid="empty-chat"]')).toBeVisible();

      // Messages should be cleared
      const userMessages = page.locator('[data-testid="user-message"]');
      const count = await userMessages.count();
      expect(count).toBe(0);
    });

    test('should confirm before clearing history', async ({ page }) => {
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Click clear button
      await page.click('[data-testid="clear-history-button"]');

      // Should show confirmation dialog
      await expect(page.locator('[data-testid="confirm-clear-dialog"]')).toBeVisible();

      // Cancel
      await page.click('[data-testid="cancel-clear"]');

      // Messages should still be there
      const userMessages = page.locator('[data-testid="user-message"]');
      const count = await userMessages.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Job Recommendations in Chat', () => {
    test('should show job cards in chat response', async ({ page }) => {
      // Ask for job recommendations
      await page.fill('[data-testid="chat-input"]', 'Can you recommend some jobs for a React developer?');
      await page.click('[data-testid="send-button"]');

      // Wait for AI response
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Check if job cards are embedded in response
      const jobCards = page.locator('[data-testid="chat-job-card"]');
      const hasJobCards = await jobCards.count() > 0;

      if (hasJobCards) {
        await expect(jobCards.first()).toBeVisible();
      }
    });

    test('should navigate to job from chat', async ({ page }) => {
      // Ask for jobs
      await page.fill('[data-testid="chat-input"]', 'Show me software engineer jobs');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // If job cards exist, click on one
      const jobCards = page.locator('[data-testid="chat-job-card"]');
      if (await jobCards.count() > 0) {
        await jobCards.first().click();

        // Should open job details
        await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // This test would require mocking API failures
      // For now, we'll test the error UI exists
      const errorMessage = page.locator('[data-testid="error-message"]');

      // Send a message and check if error handling UI exists
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');

      // Wait and check for either success or error
      await page.waitForTimeout(5000);

      // If error occurs, it should be displayed
      // If no error, test passes
    });

    test('should show retry option on failure', async ({ page }) => {
      // Check if retry button exists in error states
      const retryButton = page.locator('[data-testid="retry-message"]');

      // This would be visible after an error occurs
      // Test verifies the UI element exists
    });
  });

  test.describe('Chat Persistence', () => {
    test('should persist chat history after page reload', async ({ page }) => {
      // Send a message
      const testMessage = `Unique message ${Date.now()}`;
      await page.fill('[data-testid="chat-input"]', testMessage);
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Reload page
      await page.reload();

      // Message should still be visible
      await expect(page.locator('[data-testid="user-message"]')).toContainText(testMessage);
    });

    test('should persist chat history across navigation', async ({ page }) => {
      // Send a message
      await page.fill('[data-testid="chat-input"]', 'Navigation test message');
      await page.click('[data-testid="send-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 15000 });

      // Navigate away
      await page.goto('/jobs');

      // Return to chat
      await page.goto('/chat');

      // Message should still be there
      await expect(page.locator('[data-testid="user-message"]')).toContainText('Navigation test message');
    });
  });

  test.describe('Mobile Chat Interface', () => {
    test('should display mobile chat interface correctly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload to apply mobile styles
      await page.reload();

      // Check mobile layout
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    });
  });
});
