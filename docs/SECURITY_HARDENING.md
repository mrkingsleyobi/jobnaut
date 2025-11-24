# Security Hardening Guide - JobNaut

## Table of Contents
1. [Security Checklist](#security-checklist)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Encryption](#data-encryption)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Vulnerability Management](#vulnerability-management)
7. [Incident Response Plan](#incident-response-plan)
8. [Security Audit Schedule](#security-audit-schedule)
9. [Compliance Requirements](#compliance-requirements)

---

## Security Checklist

### Pre-Production Security Audit

- [ ] **Authentication & Authorization**
  - [ ] Clerk authentication properly configured
  - [ ] JWT tokens securely signed and validated
  - [ ] Session management with secure cookies
  - [ ] Multi-factor authentication enabled
  - [ ] Rate limiting on authentication endpoints
  - [ ] Password policy enforced (if applicable)
  - [ ] OAuth scopes properly restricted

- [ ] **Data Protection**
  - [ ] All sensitive data encrypted at rest
  - [ ] TLS 1.2+ enforced for all connections
  - [ ] Database credentials in secrets manager
  - [ ] API keys rotated and stored securely
  - [ ] PII data properly anonymized in logs
  - [ ] Backup encryption enabled

- [ ] **API Security**
  - [ ] Input validation on all endpoints
  - [ ] SQL injection prevention (parameterized queries)
  - [ ] XSS protection headers configured
  - [ ] CSRF tokens implemented
  - [ ] Rate limiting per user/IP
  - [ ] API versioning in place
  - [ ] Error messages don't leak sensitive info

- [ ] **Infrastructure**
  - [ ] Firewall rules properly configured
  - [ ] Security groups with least privilege
  - [ ] WAF (Web Application Firewall) enabled
  - [ ] DDoS protection configured
  - [ ] VPC isolation for databases
  - [ ] Bastion host for SSH access
  - [ ] Regular security patches applied

- [ ] **Monitoring & Logging**
  - [ ] Security event logging enabled
  - [ ] Failed login attempts monitored
  - [ ] Suspicious activity alerts configured
  - [ ] Audit logs immutable and retained
  - [ ] SIEM integration (if applicable)
  - [ ] Incident response playbook ready

- [ ] **Compliance**
  - [ ] GDPR compliance for EU users
  - [ ] CCPA compliance for California users
  - [ ] Data retention policies documented
  - [ ] Privacy policy published
  - [ ] Terms of service reviewed
  - [ ] Cookie consent banner implemented

---

## Authentication & Authorization

### Clerk Integration

**Current Implementation:**

```typescript
// src/middleware/auth.ts
import { clerkClient } from '@clerk/clerk-sdk-node'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies['__session']

    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify session with Clerk
    const session = await clerkClient.sessions.verifySession(sessionToken)

    if (!session || session.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    // Get user details
    const user = await clerkClient.users.getUser(session.userId)

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      role: user.publicMetadata?.role || 'user'
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}
```

**Enhanced Security:**

```typescript
// src/middleware/enhanced-auth.ts
import { clerkClient } from '@clerk/clerk-sdk-node'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '../lib/redis'

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'auth_fail',
  points: 5,
  duration: 900, // 15 minutes
  blockDuration: 3600 // 1 hour
})

export async function enhancedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip
  const userAgent = req.headers['user-agent']

  try {
    // Check rate limiting
    await rateLimiter.consume(ip)

    const sessionToken = req.cookies['__session']

    if (!sessionToken) {
      await logAuthAttempt(ip, userAgent, 'no_token', false)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Verify session
    const session = await clerkClient.sessions.verifySession(sessionToken)

    if (!session || session.status !== 'active') {
      await logAuthAttempt(ip, userAgent, session?.userId, false)
      return res.status(401).json({ error: 'Invalid session' })
    }

    // Check for suspicious activity
    const suspiciousScore = await checkSuspiciousActivity(session.userId, ip)
    if (suspiciousScore > 80) {
      await triggerSecurityAlert(session.userId, ip, suspiciousScore)
      return res.status(403).json({ error: 'Account temporarily locked' })
    }

    // Get user with fresh data
    const user = await clerkClient.users.getUser(session.userId)

    // Verify user is active
    if (user.banned || user.locked) {
      return res.status(403).json({ error: 'Account suspended' })
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      role: user.publicMetadata?.role || 'user',
      permissions: user.publicMetadata?.permissions || []
    }

    // Log successful authentication
    await logAuthAttempt(ip, userAgent, user.id, true)

    next()
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimiterRes') {
      return res.status(429).json({
        error: 'Too many failed attempts. Try again later.'
      })
    }

    console.error('Authentication error:', error)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

async function logAuthAttempt(
  ip: string,
  userAgent: string | undefined,
  userId: string | undefined,
  success: boolean
) {
  await dbWrite.authLog.create({
    data: {
      ip,
      userAgent,
      userId,
      success,
      timestamp: new Date()
    }
  })
}

async function checkSuspiciousActivity(
  userId: string,
  ip: string
): Promise<number> {
  let score = 0

  // Check for multiple IPs in short time
  const recentIPs = await redis.smembers(`user:${userId}:ips`)
  if (recentIPs.length > 5) score += 30

  // Check for failed attempts from this IP
  const failedAttempts = await dbRead.authLog.count({
    where: {
      ip,
      success: false,
      timestamp: { gte: new Date(Date.now() - 3600000) }
    }
  })
  score += failedAttempts * 10

  // Check for unusual login times
  const hour = new Date().getHours()
  if (hour < 6 || hour > 22) score += 20

  return Math.min(score, 100)
}

async function triggerSecurityAlert(
  userId: string,
  ip: string,
  score: number
) {
  // Log to security monitoring system
  console.error('SECURITY ALERT', {
    userId,
    ip,
    suspiciousScore: score,
    timestamp: new Date()
  })

  // Notify security team
  // await sendSecurityAlert({ userId, ip, score })

  // Temporarily lock account
  await redis.setex(`user:${userId}:locked`, 3600, '1')
}
```

### Role-Based Access Control (RBAC)

```typescript
// src/middleware/rbac.ts
type Permission =
  | 'jobs:read'
  | 'jobs:write'
  | 'jobs:delete'
  | 'users:read'
  | 'users:write'
  | 'admin:access'

const rolePermissions: Record<string, Permission[]> = {
  user: ['jobs:read'],
  recruiter: ['jobs:read', 'jobs:write'],
  admin: ['jobs:read', 'jobs:write', 'jobs:delete', 'users:read', 'users:write', 'admin:access']
}

export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userPermissions = rolePermissions[user.role] || []
    const hasPermission = permissions.every(p => userPermissions.includes(p))

    if (!hasPermission) {
      await logUnauthorizedAccess(user.id, permissions, req.path)
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  }
}

// Usage
app.post('/api/jobs',
  enhancedAuthMiddleware,
  requirePermission('jobs:write'),
  createJobHandler
)
```

---

## Data Encryption

### Encryption at Rest

**Database Encryption:**

```sql
-- Enable transparent data encryption in PostgreSQL
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';

-- Encrypt specific columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store sensitive data encrypted
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  phone_encrypted BYTEA,
  ssn_encrypted BYTEA,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Encrypt data
INSERT INTO users (id, email, phone_encrypted, ssn_encrypted)
VALUES (
  gen_random_uuid(),
  'user@example.com',
  pgp_sym_encrypt('555-1234', current_setting('app.encryption_key')),
  pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'))
);

-- Decrypt data
SELECT
  id,
  email,
  pgp_sym_decrypt(phone_encrypted, current_setting('app.encryption_key')) as phone,
  pgp_sym_decrypt(ssn_encrypted, current_setting('app.encryption_key')) as ssn
FROM users;
```

**Application-Level Encryption:**

```typescript
// src/lib/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64')
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// Usage
export async function storeSecureData(userId: string, ssn: string) {
  const encryptedSSN = encrypt(ssn)

  await dbWrite.user.update({
    where: { id: userId },
    data: { ssnEncrypted: encryptedSSN }
  })
}

export async function retrieveSecureData(userId: string): Promise<string> {
  const user = await dbRead.user.findUnique({
    where: { id: userId },
    select: { ssnEncrypted: true }
  })

  if (!user?.ssnEncrypted) {
    throw new Error('Data not found')
  }

  return decrypt(user.ssnEncrypted)
}
```

### Encryption in Transit

**Nginx TLS Configuration:**

```nginx
# /etc/nginx/sites-available/jobnaut
server {
    listen 443 ssl http2;
    server_name jobnaut.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/jobnaut.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jobnaut.com/privkey.pem;

    # SSL protocols
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Strong ciphers
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/jobnaut.com/chain.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.clerk.dev; style-src 'self' 'unsafe-inline';" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Rest of configuration...
}
```

**PostgreSQL SSL Connection:**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

export const dbWrite = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?sslmode=require&sslcert=/certs/client-cert.pem&sslkey=/certs/client-key.pem&sslrootcert=/certs/ca-cert.pem`
    }
  }
})
```

---

## API Security

### Input Validation

```typescript
// src/middleware/validation.ts
import { z } from 'zod'

const jobSearchSchema = z.object({
  query: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-]+$/),
  location: z.string().max(100).optional(),
  salary_min: z.number().int().min(0).max(1000000).optional(),
  salary_max: z.number().int().min(0).max(1000000).optional(),
  page: z.number().int().min(1).max(100).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body)
      req.body = validated
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        })
      }
      next(error)
    }
  }
}

// Usage
app.post('/api/jobs/search',
  authMiddleware,
  validateRequest(jobSearchSchema),
  searchJobsHandler
)
```

### SQL Injection Prevention

```typescript
// ❌ BAD: Vulnerable to SQL injection
async function getUserByEmailBad(email: string) {
  return await prisma.$queryRawUnsafe(
    `SELECT * FROM users WHERE email = '${email}'`
  )
}

// ✅ GOOD: Using parameterized queries
async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email }
  })
}

// ✅ GOOD: Using Prisma raw queries safely
async function complexQuery(searchTerm: string) {
  return await prisma.$queryRaw`
    SELECT * FROM jobs
    WHERE title ILIKE ${'%' + searchTerm + '%'}
    OR description ILIKE ${'%' + searchTerm + '%'}
  `
}
```

### XSS Prevention

```typescript
// src/middleware/sanitize.ts
import createDOMPurify from 'isomorphic-dompurify'

const DOMPurify = createDOMPurify()

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body)
  }
  next()
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }

  return obj
}

// Usage
app.post('/api/jobs',
  authMiddleware,
  sanitizeInput,
  validateRequest(createJobSchema),
  createJobHandler
)
```

### CSRF Protection

```typescript
// src/middleware/csrf.ts
import { doubleCsrf } from 'csrf-csrf'

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: true,
    httpOnly: true
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
})

// Generate token for forms
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res)
  res.json({ csrfToken: token })
})

// Protect state-changing endpoints
app.post('/api/jobs',
  doubleCsrfProtection,
  authMiddleware,
  createJobHandler
)
```

### Rate Limiting

```typescript
// src/middleware/rate-limit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '../lib/redis'

// General API rate limiter
const apiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rate_limit_api',
  points: 100, // requests
  duration: 60, // per 60 seconds
})

// Strict rate limiter for sensitive endpoints
const strictLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rate_limit_strict',
  points: 5,
  duration: 60,
  blockDuration: 300 // 5 minutes
})

export function rateLimit(limiter: RateLimiterRedis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.user?.id || req.ip
      await limiter.consume(key)
      next()
    } catch (error) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: error.msBeforeNext / 1000
      })
    }
  }
}

// Usage
app.get('/api/jobs', rateLimit(apiLimiter), searchJobsHandler)
app.post('/api/admin/users', rateLimit(strictLimiter), adminUserHandler)
```

---

## Infrastructure Security

### AWS Security Groups

```hcl
# terraform/security-groups.tf

# Application Load Balancer security group
resource "aws_security_group" "alb" {
  name        = "jobnaut-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from anywhere (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "jobnaut-alb-sg"
  }
}

# Application security group
resource "aws_security_group" "app" {
  name        = "jobnaut-app-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "jobnaut-app-sg"
  }
}

# Database security group
resource "aws_security_group" "db" {
  name        = "jobnaut-db-sg"
  description = "Security group for database"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  ingress {
    description     = "PostgreSQL from bastion"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  tags = {
    Name = "jobnaut-db-sg"
  }
}

# Bastion host security group
resource "aws_security_group" "bastion" {
  name        = "jobnaut-bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from office IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.office_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "jobnaut-bastion-sg"
  }
}
```

### WAF Configuration

```hcl
# terraform/waf.tf
resource "aws_wafv2_web_acl" "jobnaut" {
  name  = "jobnaut-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit-rule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-managed-rules-common"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-managed-rules-sql-injection"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "JobnautWAF"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "jobnaut" {
  resource_arn = aws_lb.jobnaut.arn
  web_acl_arn  = aws_wafv2_web_acl.jobnaut.arn
}
```

### Secrets Management

```typescript
// src/lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({ region: process.env.AWS_REGION })

export async function getSecret(secretName: string): Promise<any> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)

    if (response.SecretString) {
      return JSON.parse(response.SecretString)
    }

    throw new Error('Secret not found')
  } catch (error) {
    console.error('Error retrieving secret:', error)
    throw error
  }
}

// Load secrets on startup
export async function initializeSecrets() {
  const secrets = await getSecret('jobnaut/production/app-secrets')

  process.env.DATABASE_URL = secrets.DATABASE_URL
  process.env.REDIS_URL = secrets.REDIS_URL
  process.env.CLERK_SECRET_KEY = secrets.CLERK_SECRET_KEY
  process.env.ENCRYPTION_KEY = secrets.ENCRYPTION_KEY
}
```

---

## Vulnerability Management

### Dependency Scanning

```bash
# package.json scripts
{
  "scripts": {
    "audit": "npm audit --production",
    "audit:fix": "npm audit fix",
    "audit:report": "npm audit --json > security-audit.json",
    "snyk:test": "snyk test",
    "snyk:monitor": "snyk monitor"
  }
}
```

**Automated Scanning:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: |
          npm audit --production --audit-level=moderate

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test
          args: --severity-threshold=high

      - name: Docker image scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'jobnaut/backend:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### Vulnerability Response Process

**Severity Levels:**

- **Critical (CVSS 9.0-10.0)**: Patch within 24 hours
- **High (CVSS 7.0-8.9)**: Patch within 7 days
- **Medium (CVSS 4.0-6.9)**: Patch within 30 days
- **Low (CVSS 0.1-3.9)**: Patch during next release

**Response Workflow:**

1. **Detection**: Automated scans alert on new vulnerabilities
2. **Assessment**: Security team assesses impact and severity
3. **Planning**: Create patch plan and test strategy
4. **Testing**: Test patch in staging environment
5. **Deployment**: Deploy to production with rollback plan
6. **Verification**: Confirm vulnerability is resolved
7. **Documentation**: Update security logs and runbooks

---

## Incident Response Plan

### Incident Severity Classification

**P0 - Critical (Response Time: 15 minutes)**
- Active data breach
- Complete system compromise
- Ransomware attack
- Mass data exfiltration

**P1 - High (Response Time: 1 hour)**
- Unauthorized access detected
- DDoS attack in progress
- Authentication system compromised
- Sensitive data exposure

**P2 - Medium (Response Time: 4 hours)**
- Failed intrusion attempt
- Vulnerability actively exploited
- Suspicious user activity
- Minor data leak

**P3 - Low (Response Time: Next Business Day)**
- Potential vulnerability discovered
- Security policy violation
- Anomalous but non-threatening activity

### Incident Response Steps

**Phase 1: Detection & Analysis (0-30 minutes)**

```bash
# Immediate actions
1. Verify the incident
   - Check logs and monitoring dashboards
   - Confirm it's not a false positive

2. Assess scope and impact
   - Systems affected
   - Data potentially compromised
   - User impact

3. Classify severity (P0-P3)

4. Activate incident response team
   ./scripts/activate-incident-team.sh --severity=P0
```

**Phase 2: Containment (30-60 minutes)**

```bash
# Short-term containment
1. Isolate affected systems
   sudo iptables -A INPUT -s <suspicious-ip> -j DROP

2. Revoke compromised credentials
   ./scripts/rotate-credentials.sh --emergency

3. Block malicious traffic
   # Update WAF rules
   # Add IP to blocklist

4. Preserve evidence
   tar -czf /secure/evidence-$(date +%Y%m%d-%H%M%S).tar.gz /var/log/

# Long-term containment
5. Patch vulnerabilities
6. Rebuild compromised systems
7. Implement additional controls
```

**Phase 3: Eradication (1-4 hours)**

```bash
1. Identify and remove malware
   ./scripts/malware-scan.sh --deep

2. Close all unauthorized access points
3. Patch all vulnerabilities
4. Rebuild compromised systems from clean backups
5. Verify system integrity
```

**Phase 4: Recovery (4-24 hours)**

```bash
1. Restore services gradually
   ./scripts/restore-service.sh --verify

2. Monitor for signs of persistent access
3. Validate system functionality
4. Communicate with users about restored services
```

**Phase 5: Post-Incident (1-7 days)**

```bash
1. Conduct post-mortem
2. Document lessons learned
3. Update security controls
4. Update runbooks
5. Notify affected users (if required)
6. File regulatory reports (if required)
```

### Communication Plan

**Internal Communication:**
- Incident Commander: Coordinates response
- Engineering Team: Technical response
- Management: Business decisions
- Legal: Compliance and notification requirements

**External Communication:**
- Users: Via status page and email
- Customers: Direct notification if affected
- Regulators: As required by law
- Media: If public disclosure needed

**Status Page Updates:**

```bash
# Update status page
curl -X POST https://api.statuspage.io/v1/incidents \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d '{
    "incident": {
      "name": "Security Incident Investigation",
      "status": "investigating",
      "impact_override": "critical",
      "body": "We are investigating a security incident and have taken affected systems offline as a precaution."
    }
  }'
```

---

## Security Audit Schedule

### Daily

- Review failed authentication attempts
- Check firewall logs for blocked IPs
- Monitor security alerts

### Weekly

- Review access logs
- Scan for new vulnerabilities
- Check SSL certificate expiry
- Review rate limiting effectiveness

### Monthly

- Full security scan (Snyk + Trivy)
- Review and update security policies
- Audit user permissions
- Review third-party integrations
- Test incident response procedures

### Quarterly

- Penetration testing
- Security training for team
- Review and update incident response plan
- Compliance audit
- Disaster recovery test

### Annually

- Comprehensive security audit by third party
- Update security documentation
- Review and renew security certifications
- Business continuity planning review

---

## Compliance Requirements

### GDPR Compliance

**Data Subject Rights:**

```typescript
// src/routes/gdpr.ts

// Right to access
app.get('/api/gdpr/data-export', authMiddleware, async (req, res) => {
  const userId = req.user!.id

  const userData = await dbRead.user.findUnique({
    where: { id: userId },
    include: {
      applications: true,
      savedJobs: true,
      searches: true
    }
  })

  res.json(userData)
})

// Right to erasure
app.delete('/api/gdpr/delete-account', authMiddleware, async (req, res) => {
  const userId = req.user!.id

  // Anonymize instead of delete to maintain data integrity
  await dbWrite.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@anonymized.local`,
      firstName: '[DELETED]',
      lastName: '[DELETED]',
      phone: null,
      deletedAt: new Date()
    }
  })

  res.json({ message: 'Account deleted successfully' })
})

// Right to rectification
app.patch('/api/gdpr/update-data', authMiddleware, async (req, res) => {
  const userId = req.user!.id
  const { email, firstName, lastName } = req.body

  await dbWrite.user.update({
    where: { id: userId },
    data: { email, firstName, lastName }
  })

  res.json({ message: 'Data updated successfully' })
})
```

**Data Retention Policy:**

```typescript
// src/jobs/data-retention.ts

// Delete old job listings
export async function cleanupOldJobs() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  await dbWrite.job.deleteMany({
    where: {
      active: false,
      updatedAt: { lt: sixMonthsAgo }
    }
  })
}

// Anonymize old user data
export async function anonymizeInactiveUsers() {
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const inactiveUsers = await dbRead.user.findMany({
    where: {
      lastLoginAt: { lt: twoYearsAgo },
      deletedAt: null
    }
  })

  for (const user of inactiveUsers) {
    await dbWrite.user.update({
      where: { id: user.id },
      data: {
        email: `anonymized_${user.id}@deleted.local`,
        firstName: '[DELETED]',
        lastName: '[DELETED]',
        phone: null
      }
    })
  }
}
```

### CCPA Compliance

**Consumer Rights:**

```typescript
// src/routes/ccpa.ts

// Right to know
app.get('/api/ccpa/personal-info', authMiddleware, async (req, res) => {
  const userId = req.user!.id

  const personalInfo = await dbRead.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      // List all personal information collected
    }
  })

  res.json({
    categories: [
      'Identifiers (name, email)',
      'Professional information',
      'Internet activity',
      'Geolocation data'
    ],
    personalInfo
  })
})

// Do not sell my personal information
app.post('/api/ccpa/opt-out-sale', authMiddleware, async (req, res) => {
  const userId = req.user!.id

  await dbWrite.user.update({
    where: { id: userId },
    data: { optOutDataSale: true }
  })

  res.json({ message: 'Opt-out preference saved' })
})
```

---

## References

- [Operations Runbook](OPERATIONS_RUNBOOK.md)
- [Incident Response Plan](DISASTER_RECOVERY.md)
- [Monitoring Setup](MONITORING.md)
- [API Documentation](API_REFERENCE.md)

---

**Last Updated:** 2025-11-21
**Version:** 1.0
**Owner:** Security Team
