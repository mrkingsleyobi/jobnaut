// Chat Service for JobNaut
// Handles chat functionality including conversation history and message processing

// AI SDK imports
const { streamText } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { createAnthropic } = require('@ai-sdk/anthropic');

// Configuration
const aiConfig = require('../config/aiConfig');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class ChatService {
  constructor() {
    // Initialize AI providers
    this.initializeAIProviders();
  }

  /**
   * Initialize AI providers based on configuration
   */
  initializeAIProviders() {
    try {
      // Initialize OpenAI provider if API key is provided
      if (aiConfig.openai.apiKey) {
        this.openai = createOpenAI({
          apiKey: aiConfig.openai.apiKey,
          baseURL: aiConfig.openai.baseUrl,
        });
      }

      // Initialize Anthropic provider if API key is provided
      if (aiConfig.anthropic.apiKey) {
        this.anthropic = createAnthropic({
          apiKey: aiConfig.anthropic.apiKey,
        });
      }
    } catch (error) {
      logger.error('Error initializing AI providers', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of conversation messages
   */
  async getConversationHistory(userId) {
    try {
      const cacheKey = `conversation_${userId}`;
      const history = await cacheService.get(cacheKey);
      return history || [];
    } catch (error) {
      logger.error('Error fetching conversation history', { error: error.message, stack: error.stack, userId });
      throw new Error('Failed to fetch conversation history');
    }
  }

  /**
   * Send a message to the chatbot and get response
   * @param {string} userId - The user ID
   * @param {string} message - The user's message
   * @returns {Promise<Object>} - The AI response
   */
  async sendMessage(userId, message) {
    try {
      // Get conversation history from Redis cache
      const cacheKey = `conversation_${userId}`;
      let conversation = await cacheService.get(cacheKey) || [];

      // Add user message to history
      const userMessage = {
        id: this.generateMessageId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      conversation.push(userMessage);

      // Get AI response using real AI service with fallback
      const aiResponse = await this.getAIResponse(conversation);

      const aiMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      // Add AI response to history
      conversation.push(aiMessage);

      // Store conversation in Redis cache with 1 hour TTL
      await cacheService.set(cacheKey, conversation, 3600);

      return aiMessage;
    } catch (error) {
      logger.error('Error sending message', { error: error.message, stack: error.stack, userId });
      throw new Error('Failed to send message');
    }
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async clearHistory(userId) {
    try {
      const cacheKey = `conversation_${userId}`;
      await cacheService.del(cacheKey);
      return { success: true, message: 'Conversation history cleared' };
    } catch (error) {
      logger.error('Error clearing conversation history', { error: error.message, stack: error.stack, userId });
      throw new Error('Failed to clear conversation history');
    }
  }

  /**
   * Get AI response using real AI service with fallback to mock responses
   * @param {Array} conversation - Conversation history
   * @returns {Promise<string>} - AI response text
   */
  async getAIResponse(conversation) {
    // Try to get response from real AI service
    try {
      const response = await this.getRealAIResponse(conversation);
      if (response) {
        return response;
      }
    } catch (error) {
      logger.warn('AI service error, falling back to mock response', { error: error.message });
    }

    // Fallback to mock response
    return this.generateMockResponse(conversation);
  }

  /**
   * Get response from real AI service
   * @param {Array} conversation - Conversation history
   * @returns {Promise<string|null>} - AI response text or null if service unavailable
   */
  async getRealAIResponse(conversation) {
    // Check if we have any AI providers configured
    if (!this.openai && !this.anthropic) {
      return null;
    }

    // Format conversation for AI providers
    const formattedMessages = conversation.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Try each provider in order of preference
    const providers = [];

    // Add preferred provider first
    if (aiConfig.defaultProvider === 'openai' && this.openai) {
      providers.push({
        name: 'openai',
        provider: this.openai,
        model: aiConfig.openai.defaultModel,
      });
    } else if (aiConfig.defaultProvider === 'anthropic' && this.anthropic) {
      providers.push({
        name: 'anthropic',
        provider: this.anthropic,
        model: aiConfig.anthropic.defaultModel,
      });
    }

    // Add other available providers
    if (aiConfig.defaultProvider !== 'openai' && this.openai) {
      providers.push({
        name: 'openai',
        provider: this.openai,
        model: aiConfig.openai.defaultModel,
      });
    }
    if (aiConfig.defaultProvider !== 'anthropic' && this.anthropic) {
      providers.push({
        name: 'anthropic',
        provider: this.anthropic,
        model: aiConfig.anthropic.defaultModel,
      });
    }

    // Try each provider with retry logic
    for (const { name, provider, model } of providers) {
      try {
        const response = await this.callAIProvider(provider, model, formattedMessages, name);
        if (response) {
          return response;
        }
      } catch (error) {
        logger.warn('Failed to get response from AI provider', { provider: name, error: error.message });
        // Continue to next provider
      }
    }

    return null;
  }

  /**
   * Call specific AI provider with retry logic
   * @param {Function} provider - AI provider function
   * @param {string} model - Model name
   * @param {Array} messages - Formatted messages
   * @param {string} providerName - Provider name for logging
   * @returns {Promise<string>} - AI response text
   */
  async callAIProvider(provider, model, messages, providerName) {
    const maxAttempts = aiConfig.retry.maxAttempts;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Create the model
        const aiModel = provider(model);

        // Get response from AI
        const { text } = await streamText({
          model: aiModel,
          messages: messages,
        });

        // Get the full response text
        let responseText = '';
        for await (const chunk of text) {
          responseText += chunk;
        }

        return responseText;
      } catch (error) {
        lastError = error;
        logger.warn('AI provider attempt failed', { attempt, provider: providerName, error: error.message });

        // Don't wait after the last attempt
        if (attempt < maxAttempts) {
          const delay =
            aiConfig.retry.delay * Math.pow(aiConfig.retry.backoffMultiplier, attempt - 1);
          logger.debug('Retrying AI provider call', { delay, provider: providerName });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate mock response when AI services are unavailable
   * @param {Array} conversation - Conversation history
   * @returns {string} - Mock response text
   */
  generateMockResponse(conversation) {
    // Get the last user message
    const lastUserMessage = conversation.filter((msg) => msg.role === 'user').pop();
    const userMessage = lastUserMessage ? lastUserMessage.content : 'Hello';

    // Simulate processing delay if configured
    if (aiConfig.mock.delay > 0) {
      // This is just for simulation - in a real implementation, we wouldn't actually wait
      logger.debug('Simulating delay for mock response', { delay: aiConfig.mock.delay });
    }

    // Generate response based on user message
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes('hello') ||
      lowerMessage.includes('hi') ||
      lowerMessage.includes('hey')
    ) {
      return "Hello there! I'm your AI Career Coach. How can I assist you with your job search today?";
    }

    if (
      lowerMessage.includes('job') &&
      (lowerMessage.includes('search') || lowerMessage.includes('find'))
    ) {
      return "I'd be happy to help with your job search! Could you tell me more about what type of position you're looking for, your experience level, and preferred location?";
    }

    if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
      return 'A strong resume is key to landing interviews! Make sure yours highlights your achievements with specific metrics, uses action verbs, and is tailored to each job you apply for. Would you like me to review a specific section of your resume?';
    }

    if (lowerMessage.includes('interview')) {
      return "Interview preparation is crucial! Practice answering common questions like 'Tell me about yourself' and 'What are your strengths/weaknesses?' Also prepare thoughtful questions to ask your interviewer. Would you like some specific interview tips?";
    }

    if (lowerMessage.includes('salary') || lowerMessage.includes('negotiat')) {
      return "Salary negotiation can be challenging but important! Research industry standards for your role using sites like Glassdoor and PayScale. Consider the full compensation package, not just base salary. Remember, it's okay to ask for what you're worth!";
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('connect')) {
      return 'Networking is one of the most effective ways to find opportunities! Try reaching out to people in your target companies on LinkedIn, attending industry events, and joining relevant professional groups. Would you like tips on how to start networking conversations?';
    }

    if (lowerMessage.includes('thank')) {
      return "You're welcome! I'm here to help with your career journey. Is there anything else I can assist you with today?";
    }

    // Default response
    const responses = [
      "That's an interesting point! As your AI Career Coach, I'm here to help you navigate your job search. Could you tell me more about your specific situation?",
      "I understand. Career development is a journey, and I'm here to support you along the way. What are your main goals right now?",
      'Great question! Career advancement often requires a combination of skills development, networking, and strategic planning. What area would you like to focus on first?',
      "I'd be happy to help with that! Career transitions can be challenging but rewarding. What specific aspect would you like guidance on?",
      'Thanks for sharing that with me. As your AI Career Coach, I recommend focusing on your strengths while addressing areas for improvement. What skills would you like to develop further?',
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Generate a unique message ID
   * @returns {string} - Unique message ID
   */
  generateMessageId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Export a singleton instance
module.exports = new ChatService();
