# JobNaut Production Deployment Action Plan

**Status:** Ready to Execute
**Timeline:** 4 Weeks
**Priority:** P0 - Critical
**Owner:** DevOps/Platform Team

---

## Phase 1: Emergency Security Fixes (Day 1-2)

### Priority: CRITICAL - Execute Immediately

#### Task 1.1: Remove Hardcoded Credentials

**Time Estimate:** 30 minutes
**Risk:** CRITICAL

```bash
# Step 1: Remove production env files from git
git rm --cached .env.production
git rm --cached frontend/.env.production

# Step 2: Add to gitignore if not already there
echo ".env.production" >> .gitignore
echo "frontend/.env.production" >> .gitignore

# Step 3: Commit changes
git add .gitignore
git commit -m "security: Remove production credentials from repository"

# Step 4: Rotate all exposed credentials immediately
# - Generate new DATABASE_URL credentials
# - Regenerate CLERK_SECRET_KEY
# - Generate new ENCRYPTION_KEY
# - Update Meilisearch keys
```

**Verification:**
```bash
# Ensure no secrets in current commit
git log --all --full-history --source -- '*.env*'
git grep -i "password\|secret\|key" -- "*.env*"
```

#### Task 1.2: Fix Docker Security

**Time Estimate:** 15 minutes
**Risk:** CRITICAL

```bash
# Edit docker-compose.prod.yml
# Remove these lines from database service:
# ports:
#   - "5432:5432"

# Replace with:
# expose:
#   - "5432"
```

**File:** `docker-compose.prod.yml`
```yaml
database:
  image: postgres:15-alpine
  container_name: jobnaut-db-prod
  environment:
    POSTGRES_USER: ${DB_USER}
    POSTGRES_PASSWORD: ${DB_PASSWORD}
    POSTGRES_DB: ${DB_NAME}
  # ❌ REMOVE ports section
  # ✅ ADD expose instead
  expose:
    - "5432"  # Only accessible within Docker network
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

#### Task 1.3: Fix Known Vulnerabilities

**Time Estimate:** 15 minutes
**Risk:** MEDIUM

```bash
# Backend
npm audit fix

# Frontend
cd frontend
npm audit fix
cd ..

# Verify fixes
npm audit --production
cd frontend && npm audit --production
```

#### Task 1.4: Track Package Lock Files

**Time Estimate:** 10 minutes
**Risk:** MEDIUM

```bash
# Remove package-lock.json from .gitignore (line 125-126)
sed -i '/package-lock.json/d' .gitignore
sed -i '/yarn.lock/d' .gitignore

# Add lock files to git
git add package-lock.json frontend/package-lock.json
git commit -m "chore: Track package lock files for reproducible builds"
```

**Phase 1 Checklist:**
- [ ] Credentials removed from git
- [ ] All secrets rotated
- [ ] Database port fixed
- [ ] Vulnerabilities patched
- [ ] Lock files tracked
- [ ] Changes committed and pushed

---

## Phase 2: Secrets Management Setup (Day 2-3)

### Priority: CRITICAL

#### Task 2.1: Choose Secrets Management Solution

**Options:**
- AWS Secrets Manager (recommended for AWS)
- HashiCorp Vault (self-hosted or cloud)
- Azure Key Vault (for Azure)
- Google Secret Manager (for GCP)
- Docker Secrets (for Docker Swarm)
- Kubernetes Secrets (for K8s)

**For this guide, we'll use AWS Secrets Manager:**

#### Task 2.2: Create Secrets in AWS

**Time Estimate:** 45 minutes

```bash
# Install AWS CLI if not already installed
# Configure with appropriate credentials

# Create database credentials
aws secretsmanager create-secret \
  --name jobnaut/production/database \
  --description "JobNaut Production Database Credentials" \
  --secret-string '{
    "username":"jobnaut_prod_user",
    "password":"<STRONG_RANDOM_PASSWORD>",
    "host":"<RDS_ENDPOINT>",
    "port":"5432",
    "database":"jobnaut_prod"
  }'

# Create application secrets
aws secretsmanager create-secret \
  --name jobnaut/production/app \
  --description "JobNaut Production Application Secrets" \
  --secret-string '{
    "CLERK_SECRET_KEY":"<CLERK_PRODUCTION_KEY>",
    "ENCRYPTION_KEY":"<32_BYTE_RANDOM_KEY>",
    "JWT_SECRET":"<STRONG_RANDOM_SECRET>",
    "SESSION_SECRET":"<STRONG_RANDOM_SECRET>"
  }'

# Create AI provider secrets
aws secretsmanager create-secret \
  --name jobnaut/production/ai \
  --description "JobNaut AI Provider Keys" \
  --secret-string '{
    "AI_PROVIDER":"openai",
    "OPENAI_API_KEY":"<OPENAI_KEY>",
    "ANTHROPIC_API_KEY":"<ANTHROPIC_KEY>"
  }'

# Create Meilisearch secret
aws secretsmanager create-secret \
  --name jobnaut/production/meilisearch \
  --description "JobNaut Meilisearch Master Key" \
  --secret-string '{
    "MEILI_MASTER_KEY":"<STRONG_RANDOM_KEY>"
  }'
```

#### Task 2.3: Create Environment Loader Script

**Time Estimate:** 30 minutes

Create `/home/user/jobnaut/scripts/load-secrets.sh`:

```bash
#!/bin/bash
# Load secrets from AWS Secrets Manager

set -e

# Load database credentials
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id jobnaut/production/database --query SecretString --output text)
export DATABASE_URL="postgresql://$(echo $DB_SECRET | jq -r .username):$(echo $DB_SECRET | jq -r .password)@$(echo $DB_SECRET | jq -r .host):$(echo $DB_SECRET | jq -r .port)/$(echo $DB_SECRET | jq -r .database)"

# Load application secrets
APP_SECRET=$(aws secretsmanager get-secret-value --secret-id jobnaut/production/app --query SecretString --output text)
export CLERK_SECRET_KEY=$(echo $APP_SECRET | jq -r .CLERK_SECRET_KEY)
export ENCRYPTION_KEY=$(echo $APP_SECRET | jq -r .ENCRYPTION_KEY)
export JWT_SECRET=$(echo $APP_SECRET | jq -r .JWT_SECRET)
export SESSION_SECRET=$(echo $APP_SECRET | jq -r .SESSION_SECRET)

# Load AI secrets
AI_SECRET=$(aws secretsmanager get-secret-value --secret-id jobnaut/production/ai --query SecretString --output text)
export AI_PROVIDER=$(echo $AI_SECRET | jq -r .AI_PROVIDER)
export OPENAI_API_KEY=$(echo $AI_SECRET | jq -r .OPENAI_API_KEY)
export ANTHROPIC_API_KEY=$(echo $AI_SECRET | jq -r .ANTHROPIC_API_KEY)

# Load Meilisearch secret
MEILI_SECRET=$(aws secretsmanager get-secret-value --secret-id jobnaut/production/meilisearch --query SecretString --output text)
export MEILI_MASTER_KEY=$(echo $MEILI_SECRET | jq -r .MEILI_MASTER_KEY)

# Execute command with loaded secrets
exec "$@"
```

Make executable:
```bash
chmod +x scripts/load-secrets.sh
```

#### Task 2.4: Update Deployment to Use Secrets

Update `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to production
  env:
    AWS_REGION: us-east-1
  run: |
    # Configure AWS credentials
    aws configure set aws_access_key_id ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws configure set aws_secret_access_key ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws configure set region $AWS_REGION

    # SSH to production server and deploy
    ssh -i ${{ secrets.SSH_PRIVATE_KEY }} ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} << 'EOF'
      cd /opt/jobnaut
      git pull
      ./scripts/load-secrets.sh docker-compose -f docker-compose.prod.yml up -d
    EOF
```

**Phase 2 Checklist:**
- [ ] Secrets management solution chosen
- [ ] All secrets created in secret store
- [ ] Secret loading script created
- [ ] Deployment updated to use secrets
- [ ] Tested secret loading locally

---

## Phase 3: Environment Configuration (Day 3-4)

### Priority: CRITICAL

#### Task 3.1: Create Production Environment Template

Create `/home/user/jobnaut/.env.production.template`:

```bash
# JobNaut Production Environment Configuration
# DO NOT COMMIT ACTUAL VALUES - Use AWS Secrets Manager

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# CORS (comma-separated list of allowed origins)
CORS_ALLOWED_ORIGINS=https://jobnaut.com,https://www.jobnaut.com

# Database (loaded from AWS Secrets Manager)
# DATABASE_URL=postgresql://...

# Authentication (loaded from AWS Secrets Manager)
# CLERK_SECRET_KEY=...
# ENCRYPTION_KEY=...
# SESSION_SECRET=...

# AI Provider (loaded from AWS Secrets Manager)
# AI_PROVIDER=openai
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...

# AI Configuration
AI_TIMEOUT=30000
AI_RETRY_MAX_ATTEMPTS=3
AI_RETRY_DELAY=1000

# Meilisearch (loaded from AWS Secrets Manager)
# MEILI_MASTER_KEY=...
MEILISEARCH_HOST=http://meilisearch:7700

# Redis
REDIS_URL=redis://redis:6379
REDIS_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Request Configuration
MAX_REQUEST_SIZE=10mb

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Frontend
FRONTEND_URL=https://jobnaut.com
```

#### Task 3.2: Update Environment Validation

**Time Estimate:** 30 minutes

Update `/home/user/jobnaut/config/env.js`:

```javascript
class EnvConfig {
  constructor() {
    this.validateEnvironment();
  }

  validateEnvironment() {
    const requiredVars = [
      'DATABASE_URL',
      'CLERK_SECRET_KEY',
      'ENCRYPTION_KEY',
      'AI_PROVIDER',
      'CORS_ALLOWED_ORIGINS',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      } else {
        console.warn('Warning: Missing required environment variables:', missingVars);
      }
    }

    // Validate ENCRYPTION_KEY length in production
    if (process.env.NODE_ENV === 'production') {
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey || encryptionKey.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 characters in production');
      }
    }

    // Validate CORS_ALLOWED_ORIGINS in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.CORS_ALLOWED_ORIGINS) {
        throw new Error('CORS_ALLOWED_ORIGINS must be set in production');
      }
    }
  }

  getCorsOrigins() {
    if (this.isDevelopment()) {
      return ['http://localhost:3000', 'http://localhost:3001'];
    }

    const origins = process.env.CORS_ALLOWED_ORIGINS;
    if (!origins) {
      throw new Error('CORS_ALLOWED_ORIGINS not configured');
    }
    return origins.split(',').map(o => o.trim());
  }

  // ... rest of existing methods
}
```

#### Task 3.3: Update CORS Configuration

**Time Estimate:** 15 minutes

Update `/home/user/jobnaut/src/server.js`:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = envConfig.getCorsOrigins();

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

#### Task 3.4: Add HTTPS Enforcement

**Time Estimate:** 15 minutes

Add to `/home/user/jobnaut/src/server.js` before other middleware:

```javascript
// HTTPS enforcement in production
if (envConfig.isProduction()) {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, 'https://' + req.get('host') + req.url);
    }
    next();
  });

  // Secure cookie configuration
  app.use((req, res, next) => {
    res.cookie = function(name, value, options) {
      options = options || {};
      options.secure = true;
      options.httpOnly = true;
      options.sameSite = 'strict';
      return res.cookie.call(this, name, value, options);
    };
    next();
  });
}
```

**Phase 3 Checklist:**
- [ ] Environment template created
- [ ] Environment validation enhanced
- [ ] CORS configuration fixed
- [ ] HTTPS enforcement added
- [ ] Changes tested locally

---

## Phase 4: Monitoring Setup (Day 4-6)

### Priority: CRITICAL

#### Task 4.1: Set Up Sentry Error Tracking

**Time Estimate:** 45 minutes

```bash
# Install Sentry
npm install @sentry/node @sentry/tracing
```

Create `/home/user/jobnaut/src/monitoring/sentry.js`:

```javascript
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const initSentry = (app) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
      ],
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
};

const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler();
};

module.exports = { initSentry, sentryErrorHandler };
```

Update `/home/user/jobnaut/src/server.js`:

```javascript
const { initSentry, sentryErrorHandler } = require('./monitoring/sentry');

// Initialize Sentry early
initSentry(app);

// ... existing middleware ...

// Add Sentry error handler before other error handlers
app.use(sentryErrorHandler());

// ... existing error handlers ...
```

#### Task 4.2: Implement Comprehensive Health Checks

**Time Estimate:** 1 hour

Create `/home/user/jobnaut/src/routes/health.js`:

```javascript
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Liveness probe - is the app running?
router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe - can the app serve traffic?
router.get('/health/ready', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Full health check with dependencies
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  // Database check
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'healthy',
      latency: Date.now() - start + 'ms'
    };
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'unhealthy';
  }

  // Meilisearch check
  try {
    const response = await fetch(process.env.MEILISEARCH_HOST + '/health');
    health.checks.meilisearch = {
      status: response.ok ? 'healthy' : 'degraded'
    };
    if (!response.ok) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.meilisearch = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

Register in `/home/user/jobnaut/src/index.js`:

```javascript
const healthRoutes = require('./routes/health');
app.use('/', healthRoutes);
```

#### Task 4.3: Set Up Prometheus Metrics

**Time Estimate:** 1 hour

```bash
npm install prom-client
```

Create `/home/user/jobnaut/src/monitoring/metrics.js`:

```javascript
const promClient = require('prom-client');
const logger = require('../config/logger');

const register = new promClient.Registry();

// Collect default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'jobnaut_'
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'jobnaut_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'jobnaut_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestErrors = new promClient.Counter({
  name: 'jobnaut_http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();

    if (res.statusCode >= 400) {
      httpRequestErrors
        .labels(req.method, route, res.statusCode >= 500 ? 'server' : 'client')
        .inc();
    }
  });

  next();
};

// Metrics endpoint
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).end(error.message);
  }
};

module.exports = {
  metricsMiddleware,
  metricsHandler,
  register
};
```

Update `/home/user/jobnaut/src/server.js`:

```javascript
const { metricsMiddleware, metricsHandler } = require('./monitoring/metrics');

// Add metrics middleware early
app.use(metricsMiddleware);

// ... existing middleware ...

// Metrics endpoint (consider protecting this)
app.get('/metrics', metricsHandler);
```

#### Task 4.4: Implement Log Rotation

**Time Estimate:** 30 minutes

```bash
npm install winston-daily-rotate-file
```

Update `/home/user/jobnaut/src/server.js` logger configuration:

```javascript
const winston = require('winston');
require('winston-daily-rotate-file');

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: './logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: process.env.LOG_LEVEL || 'info'
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: './logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'jobnaut-api' },
  transports: [
    fileRotateTransport,
    errorRotateTransport
  ]
});

if (envConfig.isDevelopment()) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

**Phase 4 Checklist:**
- [ ] Sentry configured and tested
- [ ] Health checks implemented
- [ ] Prometheus metrics added
- [ ] Log rotation configured
- [ ] Monitoring endpoints accessible

---

## Phase 5: Database & Backups (Day 6-7)

### Priority: CRITICAL

#### Task 5.1: Create Initial Migration

**Time Estimate:** 30 minutes

```bash
# Create initial migration from schema
npx prisma migrate dev --name initial_schema

# Verify migration created
ls -la prisma/migrations/

# Test migration
npx prisma migrate reset --force
```

#### Task 5.2: Set Up Automated Backups

**Time Estimate:** 1 hour

Create `/home/user/jobnaut/scripts/backup-database.sh`:

```bash
#!/bin/bash
# Automated PostgreSQL backup script

set -e

# Configuration
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
BACKUP_FILE="jobnaut_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="${S3_BACKUP_BUCKET:-jobnaut-backups}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database connection info
DB_HOST="${DB_HOST:-database}"
DB_NAME="${DB_NAME:-jobnaut_prod}"
DB_USER="${DB_USER:-jobnaut_user}"

# Perform backup
echo "Starting backup at $(date)"
PGPASSWORD="${DB_PASSWORD}" pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
  echo "Backup created successfully: ${BACKUP_FILE} (${SIZE})"
else
  echo "ERROR: Backup failed"
  exit 1
fi

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
  echo "Uploading backup to S3..."
  aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/${DATE}/${BACKUP_FILE}"
  echo "Backup uploaded to S3"
fi

# Keep only last 7 days of local backups
find $BACKUP_DIR -name "jobnaut_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed at $(date)"
```

Make executable:
```bash
chmod +x scripts/backup-database.sh
```

#### Task 5.3: Add Backup Service to Docker Compose

**Time Estimate:** 30 minutes

Update `/home/user/jobnaut/docker-compose.prod.yml`:

```yaml
services:
  # ... existing services ...

  backup:
    image: postgres:15-alpine
    container_name: jobnaut-backup
    depends_on:
      - database
    environment:
      - DB_HOST=database
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET}
    volumes:
      - ./backups:/backups
      - ./scripts:/scripts
      - ~/.aws:/root/.aws:ro  # AWS credentials for S3 upload
    command: >
      sh -c "
      apk add --no-cache aws-cli &&
      while true; do
        /scripts/backup-database.sh
        echo 'Next backup in 24 hours'
        sleep 86400
      done
      "
    restart: unless-stopped

volumes:
  # ... existing volumes ...
  backup_data:
```

#### Task 5.4: Create Restore Script

**Time Estimate:** 30 minutes

Create `/home/user/jobnaut/scripts/restore-database.sh`:

```bash
#!/bin/bash
# Database restore script

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Available backups:"
  ls -lh /backups/postgres/*.sql.gz
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Database connection info
DB_HOST="${DB_HOST:-database}"
DB_NAME="${DB_NAME:-jobnaut_prod}"
DB_USER="${DB_USER:-jobnaut_user}"

echo "WARNING: This will overwrite the database: $DB_NAME"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo "Restoring from backup: $BACKUP_FILE"

# Drop existing database
PGPASSWORD="${DB_PASSWORD}" psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS ${DB_NAME};"

# Create new database
PGPASSWORD="${DB_PASSWORD}" psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD}" psql -h $DB_HOST -U $DB_USER $DB_NAME

echo "Restore completed successfully"

# Run migrations to ensure schema is up to date
echo "Running migrations..."
npx prisma migrate deploy

echo "Database restored and migrations applied"
```

Make executable:
```bash
chmod +x scripts/restore-database.sh
```

**Phase 5 Checklist:**
- [ ] Initial migration created
- [ ] Backup script created and tested
- [ ] Backup service added to Docker Compose
- [ ] Restore script created and tested
- [ ] First backup completed successfully

---

## Phase 6: Performance & Caching (Day 7-9)

### Priority: HIGH

#### Task 6.1: Add Redis Caching

**Time Estimate:** 1.5 hours

```bash
npm install redis
```

Update `/home/user/jobnaut/docker-compose.prod.yml`:

```yaml
services:
  # ... existing services ...

  redis:
    image: redis:7-alpine
    container_name: jobnaut-redis-prod
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  # ... existing volumes ...
  redis_data:
```

Create `/home/user/jobnaut/src/config/redis.js`:

```javascript
const redis = require('redis');
const logger = require('./logger');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis connection failed after 10 retries');
        return new Error('Redis reconnection failed');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

client.on('error', (err) => logger.error('Redis error:', err));
client.on('connect', () => logger.info('Redis connected'));
client.on('ready', () => logger.info('Redis ready'));
client.on('reconnecting', () => logger.warn('Redis reconnecting'));

let isConnected = false;

const connectRedis = async () => {
  if (!isConnected && !client.isOpen) {
    try {
      await client.connect();
      isConnected = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
  return client;
};

const disconnectRedis = async () => {
  if (isConnected && client.isOpen) {
    await client.quit();
    isConnected = false;
    logger.info('Redis disconnected');
  }
};

module.exports = {
  client,
  connectRedis,
  disconnectRedis
};
```

Create `/home/user/jobnaut/src/middleware/cache.js`:

```javascript
const { client } = require('../config/redis');
const logger = require('../config/logger');

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests
    if (req.headers.authorization) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      // Try to get from cache
      const cached = await client.get(key);

      if (cached) {
        logger.debug(`Cache hit: ${key}`);
        return res.json(JSON.parse(cached));
      }

      // Cache miss - intercept json response
      const originalJson = res.json.bind(res);

      res.json = function(data) {
        // Cache the response
        client.setEx(key, duration, JSON.stringify(data))
          .catch(err => logger.error('Cache write error:', err));

        logger.debug(`Cache set: ${key} (${duration}s)`);
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

module.exports = { cacheMiddleware };
```

#### Task 6.2: Add Compression

**Time Estimate:** 15 minutes

```bash
npm install compression
```

Update `/home/user/jobnaut/src/server.js`:

```javascript
const compression = require('compression');

// Add before other middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024  // Only compress responses > 1KB
}));
```

#### Task 6.3: Configure Database Connection Pool

**Time Estimate:** 15 minutes

Update `/home/user/jobnaut/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Update production `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30&connect_timeout=10
```

**Phase 6 Checklist:**
- [ ] Redis installed and configured
- [ ] Cache middleware implemented
- [ ] Compression added
- [ ] Database connection pool tuned
- [ ] Performance improvements tested

---

## Phase 7: CI/CD Enhancement (Day 9-11)

### Priority: HIGH

See detailed implementation in full report section 4.

**Phase 7 Checklist:**
- [ ] Deployment script implemented
- [ ] Security scanning added
- [ ] Dependency scanning configured
- [ ] Dependabot enabled
- [ ] Docker image scanning added

---

## Phase 8: Load Testing & Optimization (Day 11-13)

### Priority: MEDIUM

#### Task 8.1: Install k6

```bash
# Install k6 for load testing
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Task 8.2: Create Load Test

Create `/home/user/jobnaut/tests/load/api-load-test.js` (see full report for complete implementation).

#### Task 8.3: Run Load Tests

```bash
# Ramp-up test
k6 run --vus 10 --duration 30s tests/load/api-load-test.js

# Stress test
k6 run --vus 50 --duration 2m tests/load/api-load-test.js

# Soak test
k6 run --vus 20 --duration 10m tests/load/api-load-test.js
```

**Phase 8 Checklist:**
- [ ] k6 installed
- [ ] Load tests created
- [ ] Baseline performance measured
- [ ] Bottlenecks identified
- [ ] Optimizations applied
- [ ] Performance targets met

---

## Phase 9: Final Security Audit (Day 13-14)

### Priority: HIGH

#### Task 9.1: Security Checklist

- [ ] No credentials in git history
- [ ] Secrets properly managed
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Dependencies up to date
- [ ] No known vulnerabilities

#### Task 9.2: Run Security Scans

```bash
# Dependency audit
npm audit --production
cd frontend && npm audit --production

# OWASP dependency check
docker run --rm -v $(pwd):/src owasp/dependency-check:latest \
  --scan /src --format ALL --project JobNaut

# Docker image scan
docker scan jobnaut/backend:latest
docker scan jobnaut/frontend:latest
```

**Phase 9 Checklist:**
- [ ] Security audit completed
- [ ] All vulnerabilities addressed
- [ ] Penetration testing considered
- [ ] Security documentation updated

---

## Phase 10: Production Deployment (Day 14)

### Priority: CRITICAL

#### Pre-Deployment Checklist

**Infrastructure:**
- [ ] Production servers provisioned
- [ ] Load balancer configured
- [ ] DNS configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] VPC/network configured

**Application:**
- [ ] All secrets configured
- [ ] Environment variables set
- [ ] Database migrated
- [ ] First backup completed
- [ ] Monitoring configured
- [ ] Alerting configured

**Testing:**
- [ ] Health checks passing
- [ ] Load tests passed
- [ ] Security scan passed
- [ ] Smoke tests passed

#### Deployment Steps

1. **Deploy database first**
   ```bash
   # Apply migrations
   ./scripts/load-secrets.sh npx prisma migrate deploy
   ```

2. **Deploy backend**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d backend
   ```

3. **Deploy frontend**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```

4. **Verify deployment**
   ```bash
   curl https://api.jobnaut.com/health
   curl https://jobnaut.com
   ```

5. **Monitor for issues**
   - Check Sentry for errors
   - Check Grafana for metrics
   - Check logs for warnings

#### Rollback Plan

If issues detected:

1. **Stop new deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore previous version**
   ```bash
   git checkout <previous-version>
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Restore database if needed**
   ```bash
   ./scripts/restore-database.sh /backups/postgres/latest.sql.gz
   ```

**Phase 10 Checklist:**
- [ ] Production deployed successfully
- [ ] Health checks passing
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Team notified
- [ ] Documentation updated

---

## Post-Deployment Monitoring (Week 4+)

### Day 1-7 After Deployment

**Monitor Daily:**
- [ ] Error rates (Sentry)
- [ ] Response times (Grafana)
- [ ] Resource usage (CPU/Memory)
- [ ] Database performance
- [ ] User reports

**Review Weekly:**
- [ ] Performance trends
- [ ] Cost analysis
- [ ] Security alerts
- [ ] User feedback
- [ ] Backup verification

---

## Success Criteria

**Deployment is successful when:**
- ✅ All health checks green
- ✅ Error rate < 0.1%
- ✅ P95 response time < 500ms
- ✅ Uptime > 99.9%
- ✅ Zero security incidents
- ✅ Backups completing daily
- ✅ Monitoring capturing all metrics
- ✅ Team confident in system

---

## Emergency Contacts

**On-Call Rotation:**
- Primary: [Name] - [Phone]
- Secondary: [Name] - [Phone]
- Manager: [Name] - [Phone]

**Escalation Path:**
1. On-call engineer (0-30 min)
2. Team lead (30-60 min)
3. Engineering manager (60+ min)

---

## Quick Reference

**Common Commands:**
```bash
# Check health
curl https://api.jobnaut.com/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Run backup
./scripts/backup-database.sh

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

**Important URLs:**
- Production: https://jobnaut.com
- API: https://api.jobnaut.com
- Sentry: https://sentry.io/organizations/.../projects/jobnaut
- Grafana: https://monitoring.jobnaut.com

---

**Document Status:** Ready for Execution
**Last Updated:** 2025-11-20
**Owner:** DevOps Team
