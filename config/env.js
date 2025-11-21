// Environment configuration for JobNaut
// Comprehensive validation using envalid for type-safe environment variables

const { cleanEnv, str, num, bool, url, email, makeValidator } = require('envalid');

/**
 * Custom validator for encryption keys
 * Ensures encryption keys meet minimum security requirements
 */
const encryptionKey = makeValidator((input) => {
  if (input.length < 32) {
    throw new Error('Encryption key must be at least 32 characters long');
  }
  return input;
});

/**
 * Custom validator for log level
 */
const logLevel = makeValidator((input) => {
  const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  if (!validLevels.includes(input)) {
    throw new Error(`Log level must be one of: ${validLevels.join(', ')}`);
  }
  return input;
});

/**
 * Custom validator for AI provider
 */
const aiProvider = makeValidator((input) => {
  const validProviders = ['openai', 'anthropic', 'mock'];
  if (!validProviders.includes(input)) {
    throw new Error(`AI provider must be one of: ${validProviders.join(', ')}`);
  }
  return input;
});

/**
 * Validate and clean environment variables
 * Uses envalid for comprehensive type checking and validation
 */
const env = cleanEnv(process.env, {
  // Application Configuration
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
    desc: 'Application environment mode',
  }),
  PORT: num({
    default: 3000,
    desc: 'Server port number',
  }),

  // Database Configuration
  DATABASE_URL: url({
    desc: 'PostgreSQL database connection string',
    example: 'postgresql://user:password@localhost:5432/jobnaut',
  }),

  // Redis Configuration (required in production)
  REDIS_URL: url({
    default: 'redis://localhost:6379',
    devDefault: 'redis://localhost:6379',
    desc: 'Redis connection URL for caching',
  }),
  REDIS_PASSWORD: str({
    default: '',
    desc: 'Redis authentication password',
  }),
  REDIS_TTL: num({
    default: 300,
    desc: 'Default cache TTL in seconds',
  }),

  // Authentication - Clerk (Required)
  CLERK_PUBLISHABLE_KEY: str({
    desc: 'Clerk authentication publishable key',
    example: 'pk_test_xxxxxxxxxxxxx',
  }),
  CLERK_SECRET_KEY: str({
    desc: 'Clerk authentication secret key',
    example: 'sk_test_xxxxxxxxxxxxx',
  }),
  CLERK_WEBHOOK_SECRET: str({
    default: '',
    desc: 'Clerk webhook secret for signature verification',
  }),

  // Encryption (Custom validator)
  ENCRYPTION_KEY: str({
    default: process.env.NODE_ENV === 'production'
      ? undefined
      : 'dev-encryption-key-min-32-chars-required-for-security',
    desc: 'Encryption key for sensitive data (min 32 characters)',
  }),

  // AI Provider Configuration
  AI_PROVIDER: aiProvider({
    default: 'mock',
    desc: 'AI service provider (openai, anthropic, mock)',
  }),

  // OpenAI Configuration (Required if AI_PROVIDER=openai)
  OPENAI_API_KEY: str({
    default: '',
    desc: 'OpenAI API key',
  }),
  OPENAI_DEFAULT_MODEL: str({
    default: 'gpt-4o-mini',
    desc: 'Default OpenAI model',
  }),
  OPENAI_BASE_URL: url({
    default: 'https://api.openai.com/v1',
    desc: 'OpenAI API base URL',
  }),

  // Anthropic Configuration (Required if AI_PROVIDER=anthropic)
  ANTHROPIC_API_KEY: str({
    default: '',
    desc: 'Anthropic API key',
  }),
  ANTHROPIC_DEFAULT_MODEL: str({
    default: 'claude-3-haiku-20240307',
    desc: 'Default Anthropic model',
  }),

  // AI Request Configuration
  AI_TIMEOUT: num({
    default: 30000,
    desc: 'AI API request timeout in milliseconds',
  }),
  AI_RETRY_MAX_ATTEMPTS: num({
    default: 3,
    desc: 'Maximum retry attempts for failed AI requests',
  }),
  AI_RETRY_DELAY: num({
    default: 1000,
    desc: 'Initial retry delay in milliseconds',
  }),
  AI_RETRY_BACKOFF_MULTIPLIER: num({
    default: 2,
    desc: 'Exponential backoff multiplier for retries',
  }),

  // Mock AI Configuration
  AI_MOCK_ENABLED: bool({
    default: true,
    desc: 'Enable mock AI responses for testing',
  }),
  AI_MOCK_DELAY: num({
    default: 1000,
    desc: 'Simulated delay for mock responses in milliseconds',
  }),

  // Sentry Error Tracking
  SENTRY_DSN: str({
    default: '',
    desc: 'Sentry DSN for error tracking',
  }),
  SENTRY_RELEASE: str({
    default: 'jobnaut@1.0.0',
    desc: 'Sentry release version',
  }),
  SENTRY_ENVIRONMENT: str({
    default: process.env.NODE_ENV || 'development',
    desc: 'Sentry environment name',
  }),

  // Logging Configuration
  LOG_LEVEL: logLevel({
    default: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    desc: 'Winston logger level',
  }),
  LOG_FORMAT: str({
    default: 'json',
    choices: ['json', 'simple', 'combined'],
    desc: 'Log output format',
  }),
  LOG_MAX_FILES: num({
    default: 14,
    desc: 'Maximum number of log files to keep',
  }),
  LOG_MAX_SIZE: num({
    default: 10485760, // 10MB
    desc: 'Maximum log file size in bytes',
  }),

  // Monitoring Configuration
  PROMETHEUS_ENABLED: bool({
    default: true,
    desc: 'Enable Prometheus metrics',
  }),
  METRICS_PORT: num({
    default: 3001,
    desc: 'Metrics endpoint port',
  }),

  // Grafana Configuration
  GRAFANA_ADMIN_USER: str({
    default: 'admin',
    desc: 'Grafana admin username',
  }),
  GRAFANA_ADMIN_PASSWORD: str({
    default: 'admin',
    desc: 'Grafana admin password',
  }),
  GRAFANA_ROOT_URL: url({
    default: 'http://localhost:3002',
    desc: 'Grafana root URL',
  }),

  // Application URLs
  FRONTEND_URL: url({
    default: process.env.NODE_ENV === 'production'
      ? 'https://jobnaut.example.com'
      : 'http://localhost:3000',
    desc: 'Frontend application URL',
  }),
  API_BASE_URL: url({
    default: process.env.NODE_ENV === 'production'
      ? 'https://api.jobnaut.example.com'
      : 'http://localhost:4000',
    desc: 'Backend API base URL',
  }),

  // CORS Configuration
  CORS_ORIGIN: str({
    default: '',
    desc: 'Allowed CORS origins (comma-separated)',
  }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: num({
    default: 900000, // 15 minutes
    desc: 'Rate limit window in milliseconds',
  }),
  RATE_LIMIT_MAX_REQUESTS: num({
    default: process.env.NODE_ENV === 'production' ? 100 : 500,
    desc: 'Maximum requests per window',
  }),
  AUTH_RATE_LIMIT_MAX: num({
    default: 5,
    desc: 'Maximum auth requests per window',
  }),
});

/**
 * Additional validation for conditional requirements
 */
function validateConditionalRequirements() {
  const errors = [];

  // Validate AI provider-specific requirements
  if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  if (env.AI_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic');
  }

  // Validate production requirements
  if (env.NODE_ENV === 'production') {
    if (env.REDIS_URL === 'redis://localhost:6379') {
      errors.push('REDIS_URL must be configured for production (not localhost)');
    }

    if (!env.SENTRY_DSN) {
      console.warn('WARNING: SENTRY_DSN is not set in production. Error tracking will be disabled.');
    }

    if (env.GRAFANA_ADMIN_PASSWORD === 'admin') {
      errors.push('GRAFANA_ADMIN_PASSWORD must be changed from default in production');
    }

    if (env.ENCRYPTION_KEY === 'dev-encryption-key-min-32-chars-required-for-security') {
      errors.push('ENCRYPTION_KEY must be set to a secure value in production');
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:\n');
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error('\nPlease fix the above errors and restart the application.\n');

    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Run conditional validation
validateConditionalRequirements();

/**
 * Log sanitized configuration summary
 * Hides sensitive values while showing configuration status
 */
function getConfigSummary() {
  const sanitize = (key, value) => {
    const sensitiveKeys = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'DSN'];
    if (sensitiveKeys.some(sk => key.includes(sk))) {
      return value ? '***SET***' : '(not set)';
    }
    return value;
  };

  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    database: env.DATABASE_URL ? '***CONFIGURED***' : '(not set)',
    redis: env.REDIS_URL || '(not set)',
    auth: {
      clerk: {
        publishable: env.CLERK_PUBLISHABLE_KEY ? '***SET***' : '(not set)',
        secret: env.CLERK_SECRET_KEY ? '***SET***' : '(not set)',
      },
    },
    ai: {
      provider: env.AI_PROVIDER,
      openai: {
        configured: !!env.OPENAI_API_KEY,
        model: env.OPENAI_DEFAULT_MODEL,
      },
      anthropic: {
        configured: !!env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_DEFAULT_MODEL,
      },
    },
    monitoring: {
      sentry: !!env.SENTRY_DSN,
      prometheus: env.PROMETHEUS_ENABLED,
      metricsPort: env.METRICS_PORT,
    },
    logging: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
    },
  };
}

/**
 * Convenience methods for common checks
 */
const envConfig = {
  // Expose validated environment variables
  ...env,

  // Convenience methods
  isDevelopment: () => env.NODE_ENV === 'development',
  isProduction: () => env.NODE_ENV === 'production',
  isTest: () => env.NODE_ENV === 'test',

  // Getters for backward compatibility
  getDatabaseUrl: () => env.DATABASE_URL,
  getClerkSecretKey: () => env.CLERK_SECRET_KEY,
  getPort: () => env.PORT,

  // Configuration summary
  getConfigSummary,
};

module.exports = envConfig;
