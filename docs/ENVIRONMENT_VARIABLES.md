# Environment Variables Guide

Complete guide to configuring JobNaut through environment variables.

## Table of Contents

- [Environment Validation](#environment-validation)
- [Required Variables](#required-variables)
- [Optional Variables](#optional-variables)
- [AI Configuration](#ai-configuration)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Authentication Configuration](#authentication-configuration)
- [Application Configuration](#application-configuration)
- [Environment-Specific Configurations](#environment-specific-configurations)
- [Example Configurations](#example-configurations)
- [Validation and Error Messages](#validation-and-error-messages)

## Environment Validation

JobNaut uses **[envalid](https://github.com/af/envalid)** for comprehensive environment variable validation. All variables are validated on application startup with:

### Validation Features

- **Type Checking**: Ensures variables are the correct type (string, number, boolean, URL, email)
- **Required vs Optional**: Enforces required variables and provides defaults for optional ones
- **Default Values**: Environment-specific defaults for development, test, and production
- **Custom Validators**: Special validation for encryption keys (min 32 chars), log levels, AI providers
- **Conditional Requirements**: Validates dependencies (e.g., OpenAI API key required when AI_PROVIDER=openai)
- **Production Strictness**: Extra validation in production (secure passwords, proper URLs, etc.)
- **Fail Fast**: Application exits immediately if validation fails in production
- **Clear Error Messages**: Detailed error messages explain what's wrong and how to fix it

### How It Works

```javascript
// config/env.js validates on import
const envConfig = require('../config/env');

// Access validated variables
console.log(envConfig.PORT);           // Always a number
console.log(envConfig.DATABASE_URL);   // Always a valid URL
console.log(envConfig.AI_PROVIDER);    // Always 'openai', 'anthropic', or 'mock'

// Convenience methods
if (envConfig.isProduction()) {
  // Production-specific logic
}
```

### Startup Validation

When the server starts, you'll see:

```bash
=== JobNaut Configuration ===
{
  "environment": "development",
  "port": 3000,
  "database": "***CONFIGURED***",
  "redis": "redis://localhost:6379",
  "auth": {
    "clerk": {
      "publishable": "***SET***",
      "secret": "***SET***"
    }
  },
  "ai": {
    "provider": "mock",
    "openai": {
      "configured": false,
      "model": "gpt-4o-mini"
    }
  }
}
==============================
```

### Validation Errors

If validation fails, you'll see clear error messages:

```bash
❌ Environment validation failed:

  - OPENAI_API_KEY is required when AI_PROVIDER=openai
  - ENCRYPTION_KEY must be set to a secure value in production
  - REDIS_URL must be configured for production (not localhost)

Please fix the above errors and restart the application.
```

## Required Variables

These variables **must** be set for JobNaut to function properly.

### NODE_ENV

**Description:** Application environment mode
**Type:** String
**Values:** `development`, `production`, `test`
**Default:** `development`
**Required:** Yes

```bash
NODE_ENV=production
```

### PORT

**Description:** Server port number
**Type:** Number
**Default:** `4000`
**Required:** Yes

```bash
PORT=4000
```

### DATABASE_URL

**Description:** PostgreSQL database connection string
**Type:** String (URL)
**Required:** Yes

```bash
# Development
DATABASE_URL=postgresql://user:password@localhost:5432/jobnaut

# Production
DATABASE_URL=postgresql://user:password@db.example.com:5432/jobnaut?schema=public
```

**Format:** `postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...]`

### CLERK_PUBLISHABLE_KEY

**Description:** Clerk authentication publishable key
**Type:** String
**Required:** Yes
**Get it from:** [Clerk Dashboard](https://dashboard.clerk.dev)

```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

### CLERK_SECRET_KEY

**Description:** Clerk authentication secret key
**Type:** String (Secret)
**Required:** Yes
**Get it from:** [Clerk Dashboard](https://dashboard.clerk.dev)

```bash
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

**Security:** Keep this secret! Never commit to version control.

## Optional Variables

### AI_PROVIDER

**Description:** AI service provider for chat functionality
**Type:** String
**Values:** `openai`, `anthropic`, `mock`
**Default:** `mock`
**Required:** No

```bash
AI_PROVIDER=openai
```

**Options:**
- `openai` - Use OpenAI GPT models
- `anthropic` - Use Anthropic Claude models
- `mock` - Use mock responses (for testing)

### REDIS_URL

**Description:** Redis connection URL for caching
**Type:** String (URL)
**Default:** `redis://localhost:6379`
**Required:** No (but recommended for production)

```bash
# Development
REDIS_URL=redis://localhost:6379

# Production with authentication
REDIS_URL=redis://:password@redis-host:6379

# With database selection
REDIS_URL=redis://localhost:6379/0
```

### LOG_LEVEL

**Description:** Winston logger level
**Type:** String
**Values:** `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`
**Default:** `info` (production), `debug` (development)
**Required:** No

```bash
LOG_LEVEL=info
```

## AI Configuration

### OpenAI Configuration

#### OPENAI_API_KEY

**Description:** OpenAI API key for GPT models
**Type:** String (Secret)
**Required:** Only if `AI_PROVIDER=openai`
**Get it from:** [OpenAI Platform](https://platform.openai.com/api-keys)

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

#### OPENAI_DEFAULT_MODEL

**Description:** Default OpenAI model to use
**Type:** String
**Default:** `gpt-4o-mini`
**Required:** No

```bash
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

**Available Models:**
- `gpt-4o` - Most capable model
- `gpt-4o-mini` - Fast and cost-effective
- `gpt-4-turbo` - Previous generation
- `gpt-3.5-turbo` - Legacy fast model

#### OPENAI_BASE_URL

**Description:** OpenAI API base URL (for proxies or custom endpoints)
**Type:** String (URL)
**Default:** `https://api.openai.com/v1`
**Required:** No

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Anthropic Configuration

#### ANTHROPIC_API_KEY

**Description:** Anthropic API key for Claude models
**Type:** String (Secret)
**Required:** Only if `AI_PROVIDER=anthropic`
**Get it from:** [Anthropic Console](https://console.anthropic.com/)

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

#### ANTHROPIC_DEFAULT_MODEL

**Description:** Default Anthropic model to use
**Type:** String
**Default:** `claude-3-haiku-20240307`
**Required:** No

```bash
ANTHROPIC_DEFAULT_MODEL=claude-3-haiku-20240307
```

**Available Models:**
- `claude-3-opus-20240229` - Most capable model
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and cost-effective

### AI Request Configuration

#### AI_TIMEOUT

**Description:** AI API request timeout in milliseconds
**Type:** Number
**Default:** `30000` (30 seconds)
**Required:** No

```bash
AI_TIMEOUT=30000
```

#### AI_RETRY_MAX_ATTEMPTS

**Description:** Maximum retry attempts for failed AI requests
**Type:** Number
**Default:** `3`
**Required:** No

```bash
AI_RETRY_MAX_ATTEMPTS=3
```

#### AI_RETRY_DELAY

**Description:** Initial retry delay in milliseconds
**Type:** Number
**Default:** `1000` (1 second)
**Required:** No

```bash
AI_RETRY_DELAY=1000
```

#### AI_RETRY_BACKOFF_MULTIPLIER

**Description:** Exponential backoff multiplier for retries
**Type:** Number
**Default:** `2`
**Required:** No

```bash
AI_RETRY_BACKOFF_MULTIPLIER=2
```

**Example:** With default values, retries happen at 1s, 2s, 4s

### Mock AI Configuration

#### AI_MOCK_ENABLED

**Description:** Enable mock AI responses for testing
**Type:** Boolean
**Default:** `true`
**Required:** No

```bash
AI_MOCK_ENABLED=true
```

#### AI_MOCK_DELAY

**Description:** Simulated delay for mock responses in milliseconds
**Type:** Number
**Default:** `1000` (1 second)
**Required:** No

```bash
AI_MOCK_DELAY=1000
```

## Database Configuration

### DATABASE_URL

See [Required Variables](#required-variables) section.

### Database Connection Pool

These are configured in the Prisma schema but can be overridden:

```bash
# Maximum number of connections in the pool
DATABASE_POOL_MAX=10

# Minimum number of connections in the pool
DATABASE_POOL_MIN=2

# Connection timeout in milliseconds
DATABASE_CONNECT_TIMEOUT=10000

# Idle timeout in milliseconds
DATABASE_IDLE_TIMEOUT=30000
```

## Redis Configuration

### REDIS_URL

**Description:** Redis connection URL
**Type:** String (URL)
**Default:** `redis://localhost:6379`
**Required:** No (but recommended for production)

```bash
REDIS_URL=redis://localhost:6379
```

### REDIS_PASSWORD

**Description:** Redis authentication password
**Type:** String (Secret)
**Default:** None
**Required:** No (unless Redis requires auth)

```bash
REDIS_PASSWORD=your_redis_password
```

**Note:** Password can also be included in `REDIS_URL`:

```bash
REDIS_URL=redis://:your_redis_password@localhost:6379
```

### REDIS_TTL

**Description:** Default cache TTL (Time To Live) in seconds
**Type:** Number
**Default:** `300` (5 minutes)
**Required:** No

```bash
REDIS_TTL=300
```

### Redis Database Selection

```bash
# Use Redis database 0 (default)
REDIS_URL=redis://localhost:6379/0

# Use Redis database 1
REDIS_URL=redis://localhost:6379/1
```

## Authentication Configuration

### Clerk Configuration

#### CLERK_PUBLISHABLE_KEY

See [Required Variables](#required-variables) section.

#### CLERK_SECRET_KEY

See [Required Variables](#required-variables) section.

#### CLERK_WEBHOOK_SECRET

**Description:** Clerk webhook secret for verifying webhook signatures
**Type:** String (Secret)
**Required:** No (only if using Clerk webhooks)
**Get it from:** [Clerk Dashboard > Webhooks](https://dashboard.clerk.dev)

```bash
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### CORS Configuration

#### CORS_ORIGIN

**Description:** Allowed CORS origins (comma-separated)
**Type:** String
**Default:** Auto-configured based on environment
**Required:** No

```bash
# Development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## Application Configuration

### Frontend URL

#### FRONTEND_URL

**Description:** Frontend application URL
**Type:** String (URL)
**Default:** `http://localhost:3000` (development)
**Required:** No

```bash
# Development
FRONTEND_URL=http://localhost:3000

# Production
FRONTEND_URL=https://jobnaut.example.com
```

### API Configuration

#### API_BASE_URL

**Description:** Backend API base URL
**Type:** String (URL)
**Default:** `http://localhost:4000` (development)
**Required:** No

```bash
# Development
API_BASE_URL=http://localhost:4000

# Production
API_BASE_URL=https://api.jobnaut.example.com
```

### Rate Limiting

#### RATE_LIMIT_WINDOW_MS

**Description:** Rate limit window in milliseconds
**Type:** Number
**Default:** `900000` (15 minutes)
**Required:** No

```bash
RATE_LIMIT_WINDOW_MS=900000
```

#### RATE_LIMIT_MAX_REQUESTS

**Description:** Maximum requests per window
**Type:** Number
**Default:** `100` (production), `500` (development)
**Required:** No

```bash
RATE_LIMIT_MAX_REQUESTS=100
```

#### AUTH_RATE_LIMIT_MAX

**Description:** Maximum auth requests per window
**Type:** Number
**Default:** `5`
**Required:** No

```bash
AUTH_RATE_LIMIT_MAX=5
```

### Logging Configuration

#### LOG_FILE_ERROR

**Description:** Error log file path
**Type:** String (Path)
**Default:** `./logs/error.log`
**Required:** No

```bash
LOG_FILE_ERROR=./logs/error.log
```

#### LOG_FILE_COMBINED

**Description:** Combined log file path
**Type:** String (Path)
**Default:** `./logs/combined.log`
**Required:** No

```bash
LOG_FILE_COMBINED=./logs/combined.log
```

## Environment-Specific Configurations

### Development (.env)

```bash
# Application
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://jobnaut:password@localhost:5432/jobnaut_dev

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# AI (Mock for development)
AI_PROVIDER=mock
AI_MOCK_ENABLED=true
AI_MOCK_DELAY=1000

# Logging
LOG_LEVEL=debug

# Frontend
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000

# Rate Limiting (Higher limits for development)
RATE_LIMIT_MAX_REQUESTS=500
```

### Production (.env.production)

```bash
# Application
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://jobnaut:${DB_PASSWORD}@db.production.com:5432/jobnaut?schema=public&connection_limit=20&pool_timeout=20

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@redis.production.com:6379/0
REDIS_TTL=600

# Authentication
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# AI (Production)
AI_PROVIDER=openai
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_DEFAULT_MODEL=gpt-4o-mini
AI_TIMEOUT=30000
AI_RETRY_MAX_ATTEMPTS=3

# Logging
LOG_LEVEL=info
LOG_FILE_ERROR=/var/log/jobnaut/error.log
LOG_FILE_COMBINED=/var/log/jobnaut/combined.log

# Frontend
FRONTEND_URL=https://jobnaut.example.com
API_BASE_URL=https://api.jobnaut.example.com

# CORS
CORS_ORIGIN=https://jobnaut.example.com,https://www.jobnaut.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

### Testing (.env.test)

```bash
# Application
NODE_ENV=test
PORT=4001

# Database (Separate test database)
DATABASE_URL=postgresql://jobnaut:password@localhost:5432/jobnaut_test

# Redis (Separate test Redis DB)
REDIS_URL=redis://localhost:6379/1

# Authentication (Test keys)
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# AI (Always use mock for tests)
AI_PROVIDER=mock
AI_MOCK_ENABLED=true
AI_MOCK_DELAY=0

# Logging
LOG_LEVEL=error

# Rate Limiting (No limits for tests)
RATE_LIMIT_MAX_REQUESTS=10000
```

## Example Configurations

### Docker Compose Example

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DATABASE_URL=postgresql://jobnaut:${DB_PASSWORD}@postgres:5432/jobnaut
      - REDIS_URL=redis://redis:6379
      - CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - AI_PROVIDER=${AI_PROVIDER:-openai}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

### Kubernetes ConfigMap Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jobnaut-config
data:
  NODE_ENV: "production"
  PORT: "4000"
  AI_PROVIDER: "openai"
  REDIS_TTL: "600"
  LOG_LEVEL: "info"
```

### Kubernetes Secret Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jobnaut-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@host:5432/db"
  CLERK_SECRET_KEY: "sk_live_xxxxxxxxxxxxx"
  OPENAI_API_KEY: "sk-xxxxxxxxxxxxx"
  REDIS_PASSWORD: "your_redis_password"
```

## Security Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore
.env
.env.local
.env.production
.env.*.local
```

### 2. Use Environment-Specific Files

```bash
.env.example         # Template (safe to commit)
.env                 # Local development (never commit)
.env.production      # Production (never commit)
.env.test           # Testing (never commit)
```

### 3. Rotate Secrets Regularly

- Change API keys every 90 days
- Rotate database passwords quarterly
- Update authentication secrets after team changes

### 4. Use Secret Management Services

For production, use:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

### 5. Validate Environment Variables

JobNaut automatically validates all environment variables on startup using **envalid**. No manual validation needed!

The validation happens in `/config/env.js` and includes:

- Type validation (string, number, boolean, URL)
- Required vs optional checks
- Custom validators for encryption keys, log levels, etc.
- Conditional requirements (e.g., API keys when provider is selected)
- Production-specific strictness
- Clear error messages with suggestions

To test validation, try running with invalid values:

```bash
# This will fail validation
AI_PROVIDER=invalid npm start

# Error: AI provider must be one of: openai, anthropic, mock
```

You can also check the validation logic in `/config/env.js`:

```javascript
const envConfig = require('./config/env');

// Get sanitized configuration summary
console.log(envConfig.getConfigSummary());
```

## Troubleshooting

### Issue: "Database connection failed"

**Solution:** Check `DATABASE_URL` format and credentials

```bash
# Test connection
psql "$DATABASE_URL"
```

### Issue: "Redis connection timeout"

**Solution:** Verify Redis is running and accessible

```bash
# Test Redis connection
redis-cli -u "$REDIS_URL" ping
```

### Issue: "Clerk authentication failed"

**Solution:** Verify Clerk keys are correct

```bash
# Check if keys are set
echo $CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY
```

### Issue: "AI provider error"

**Solution:** Check AI provider configuration

```bash
# Verify OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Additional Resources

- [Clerk Documentation](https://clerk.dev/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Redis Documentation](https://redis.io/documentation)

## Validation and Error Messages

### Common Validation Errors

#### 1. Missing Required Variables

```bash
Error: The following environment variables are required but were not set:
  - DATABASE_URL
  - CLERK_SECRET_KEY
```

**Solution**: Add the missing variables to your `.env` file.

#### 2. Invalid Type

```bash
Error: Invalid PORT (expected number, got string)
```

**Solution**: Ensure PORT is a valid number: `PORT=3000`

#### 3. Invalid URL Format

```bash
Error: Invalid DATABASE_URL (expected valid URL)
```

**Solution**: Check URL format: `postgresql://user:pass@host:5432/db`

#### 4. Invalid Choice

```bash
Error: AI provider must be one of: openai, anthropic, mock
```

**Solution**: Use a valid AI provider: `AI_PROVIDER=openai`

#### 5. Conditional Requirements

```bash
❌ Environment validation failed:
  - OPENAI_API_KEY is required when AI_PROVIDER=openai
```

**Solution**: Either set `OPENAI_API_KEY` or change `AI_PROVIDER` to `mock`

#### 6. Production Security

```bash
❌ Environment validation failed:
  - ENCRYPTION_KEY must be set to a secure value in production
  - GRAFANA_ADMIN_PASSWORD must be changed from default in production
```

**Solution**: Set secure values for production:

```bash
ENCRYPTION_KEY=$(openssl rand -base64 32)
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24)
```

### Validation Configuration

The validation logic is in `/config/env.js`. Key features:

1. **Type Validators**: `str()`, `num()`, `bool()`, `url()`, `email()`
2. **Custom Validators**: `logLevel()`, `aiProvider()`, `encryptionKey()`
3. **Conditional Checks**: `validateConditionalRequirements()`
4. **Environment-Specific Defaults**: Different defaults for dev/test/prod

### Testing Validation

To test validation locally:

```bash
# Test missing required variable
unset DATABASE_URL && npm start
# Should fail with clear error message

# Test invalid type
PORT=abc npm start
# Should fail: expected number

# Test invalid AI provider
AI_PROVIDER=invalid npm start
# Should fail: must be openai, anthropic, or mock

# Test conditional requirement
AI_PROVIDER=openai npm start
# Should warn: OPENAI_API_KEY required
```

### Environment Variable Checklist

Before deploying to production, ensure:

- [ ] All required variables are set
- [ ] DATABASE_URL points to production database (not localhost)
- [ ] REDIS_URL points to production Redis (not localhost)
- [ ] CLERK_SECRET_KEY is production key (starts with `sk_live_`)
- [ ] ENCRYPTION_KEY is secure (32+ characters, cryptographically random)
- [ ] GRAFANA_ADMIN_PASSWORD is changed from default
- [ ] SENTRY_DSN is set for error tracking
- [ ] AI provider API keys are set if not using mock
- [ ] FRONTEND_URL and API_BASE_URL are production URLs
- [ ] LOG_LEVEL is set to `info` or `warn` (not `debug`)

## Support

For configuration issues:
- GitHub Issues: https://github.com/mrkingsleyobi/jobnaut/issues
- Documentation: https://github.com/mrkingsleyobi/jobnaut/docs
- Envalid Documentation: https://github.com/af/envalid
