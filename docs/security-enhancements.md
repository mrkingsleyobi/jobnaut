# Security Enhancements for JobNaut

## Current Security Analysis

The current implementation has a solid foundation with Clerk authentication, but there are several areas that need enhancement to meet production security standards.

## Security Vulnerabilities and Recommendations

### 1. Input Validation and Sanitization

#### Current Issues:

- Limited input validation in API endpoints
- No sanitization of user inputs
- Potential for injection attacks

#### Recommendations:

```javascript
// Add input validation middleware
const { body, validationResult } = require('express-validator');

// Example validation for user profile update
router.put(
  '/profile',
  [
    authMiddleware,
    body('name').isLength({ min: 1, max: 100 }).trim().escape(),
    body('location').isLength({ max: 100 }).trim().escape(),
    body('experienceLevel').isIn(['entry', 'mid', 'senior', 'lead']).optional(),
    body('skills').isArray().optional(),
    body('skills.*').isString().trim().escape(),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process validated data
    // ...
  }
);
```

### 2. Rate Limiting

#### Current Issues:

- No rate limiting on API endpoints
- Vulnerable to brute force and DoS attacks

#### Recommendations:

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);
```

### 3. CORS Configuration

#### Current Issues:

- No explicit CORS configuration
- Potential for cross-origin attacks

#### Recommendations:

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com',
      'https://www.yourdomain.com',
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### 4. Security Headers

#### Current Issues:

- No security headers set
- Vulnerable to various web attacks

#### Recommendations:

```javascript
const helmet = require('helmet');

// Add security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.clerk.accounts.dev'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

### 5. Authentication Security Enhancements

#### Current Issues:

- Basic session validation
- No additional security checks

#### Recommendations:

```javascript
// Enhanced authentication middleware with additional security checks
const enhancedAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
    }

    const sessionToken = authHeader.substring(7);

    // Validate session
    const session = await clerk.sessions.verifySessionToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized: Session not active' });
    }

    // Check session expiration
    const now = Math.floor(Date.now() / 1000);
    if (session.expireAt && session.expireAt < now) {
      return res.status(401).json({ error: 'Unauthorized: Session expired' });
    }

    // Get user
    const clerkUser = await clerk.users.getUser(session.userId);
    if (!clerkUser) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    // Check if user account is active
    if (
      clerkUser.banned ||
      !clerkUser.emailAddresses.some((email) => email.verification.status === 'verified')
    ) {
      return res.status(401).json({ error: 'Unauthorized: User account not active' });
    }

    // Sync with local database
    const localUser = await clerkAuthService.syncUserWithDatabase(clerkUser);

    // Attach user to request
    req.user = {
      ...localUser,
      clerkUser,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
```

### 6. Data Security

#### Current Issues:

- Sensitive data stored without encryption
- No data access controls

#### Recommendations:

```javascript
// Add encryption for sensitive data
const crypto = require('crypto');

class DataEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateKey();
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Use for sensitive user data like notes or application status
const dataEncryption = new DataEncryption();
```

### 7. API Security

#### Current Issues:

- No request size limits
- No protection against common attacks

#### Recommendations:

```javascript
// Add request size limits and protection
app.use(
  express.json({
    limit: '10mb',
    // Prevent prototype pollution
    strict: true,
  })
);

// Add protection against common attacks
app.use((req, res, next) => {
  // Remove dangerous headers
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
});
```

### 8. Logging and Monitoring

#### Current Issues:

- Basic error logging
- No security event monitoring

#### Recommendations:

```javascript
const winston = require('winston');

// Create security logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'security.log' })],
});

// Log security events
const logSecurityEvent = (event, details) => {
  securityLogger.info({
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  });
};

// Example usage in authentication
router.post('/login', authLimiter, async (req, res) => {
  try {
    // ... authentication logic

    if (success) {
      logSecurityEvent('successful_login', { userId: user.id });
    } else {
      logSecurityEvent('failed_login', { email: req.body.email });
    }
  } catch (error) {
    logSecurityEvent('authentication_error', { error: error.message });
    // ... error handling
  }
});
```

### 9. Dependency Security

#### Current Issues:

- No dependency vulnerability scanning
- No security audit process

#### Recommendations:

```bash
# Add security audit to package.json scripts
{
  "scripts": {
    "security:audit": "npm audit",
    "security:audit-fix": "npm audit fix",
    "security:check": "npm audit --audit-level high"
  }
}

# Add to CI/CD pipeline
# Run security checks before deployment
npm run security:audit
```

### 10. Environment Security

#### Current Issues:

- Environment variables not properly secured
- No secret management

#### Recommendations:

```javascript
// Enhanced environment validation
class SecureEnvConfig {
  constructor() {
    this.validateEnvironment();
    this.setupSecrets();
  }

  validateEnvironment() {
    // Validate required environment variables
    const requiredVars = ['DATABASE_URL', 'CLERK_SECRET_KEY', 'ENCRYPTION_KEY'];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate sensitive environment variables
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.CLERK_SECRET_KEY === 'YOUR_CLERK_SECRET_KEY'
    ) {
      throw new Error('Invalid Clerk secret key in production');
    }
  }

  setupSecrets() {
    // Mask sensitive values in logs
    process.env.CLERK_SECRET_KEY = '[REDACTED]';
    process.env.DATABASE_URL = '[REDACTED]';
  }
}
```

## Security Testing Implementation

### 1. Automated Security Testing

```javascript
// Add security tests to test suite
describe('Security Tests', () => {
  test('should reject requests without proper authentication', async () => {
    const response = await request(app).get('/api/v1/user/profile');
    expect(response.status).toBe(401);
  });

  test('should reject invalid session tokens', async () => {
    const response = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });

  test('should rate limit authentication attempts', async () => {
    // Make multiple authentication requests
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' });
    }

    // The last request should be rate limited
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });
    expect(response.status).toBe(429);
  });
});
```

### 2. Manual Security Testing Checklist

- [ ] Test SQL injection attempts
- [ ] Test XSS attacks
- [ ] Test CSRF protection
- [ ] Test session fixation
- [ ] Test brute force protection
- [ ] Test file upload security
- [ ] Test API rate limiting
- [ ] Test CORS configuration
- [ ] Test security headers
- [ ] Test sensitive data exposure

## Production Security Hardening

### 1. Infrastructure Security

- Use HTTPS in production
- Implement proper firewall rules
- Use secure database connections
- Implement proper backup and recovery
- Use container security best practices

### 2. Application Security

- Regular security audits
- Dependency vulnerability scanning
- Penetration testing
- Security monitoring and alerting
- Incident response procedures

## Conclusion

These security enhancements will significantly improve the security posture of the JobNaut application by:

1. Adding proper input validation and sanitization
2. Implementing rate limiting to prevent abuse
3. Configuring CORS properly
4. Adding security headers
5. Enhancing authentication security
6. Implementing data encryption
7. Adding proper logging and monitoring
8. Securing dependencies and environment

Implementation should be prioritized based on risk assessment, starting with authentication security, input validation, and rate limiting.
