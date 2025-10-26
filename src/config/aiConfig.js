// AI Service Configuration for JobNaut
// Handles configuration for various AI providers with fallback options

require('dotenv').config();

const aiConfig = {
  // Default provider (can be 'openai', 'anthropic', or 'mock')
  defaultProvider: process.env.AI_PROVIDER || 'mock',

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  },

  // Anthropic Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-haiku-20240307'
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    delay: 1000, // milliseconds
    backoffMultiplier: 2
  },

  // Timeout configuration
  timeout: process.env.AI_TIMEOUT ? parseInt(process.env.AI_TIMEOUT) : 30000, // 30 seconds

  // Mock configuration
  mock: {
    enabled: process.env.AI_MOCK_ENABLED === 'true' || true,
    delay: process.env.AI_MOCK_DELAY ? parseInt(process.env.AI_MOCK_DELAY) : 1000 // milliseconds
  }
};

module.exports = aiConfig;