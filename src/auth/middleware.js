// Authentication middleware for JobNaut
// Handles authentication checks for protected routes

const clerkAuthService = require('./clerk');
const securityLogger = require('../services/securityLogger');

/**
 * Enhanced authentication middleware
 * Verifies Clerk session and attaches user to request with additional security checks
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get session token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLogger.logAuthEvent('login_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'No valid token provided',
        url: req.originalUrl,
      });
      return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate session
    const clerk = clerkAuthService.getClient();
    let session;

    try {
      // Use the verifyToken method available in the Clerk client
      if (typeof clerk.verifyToken === 'function') {
        session = await clerk.verifyToken(sessionToken);
      } else {
        console.error('Clerk client does not have verifyToken method');
        securityLogger.logSecurityIncident('auth_system_error', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          error: 'Clerk client does not have verifyToken method',
        });
        return res.status(500).json({ error: 'Internal server error during authentication' });
      }
    } catch (error) {
      securityLogger.logAuthEvent('login_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Invalid session',
        url: req.originalUrl,
        error: error.message,
      });
      return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }

    if (!session) {
      securityLogger.logAuthEvent('login_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Invalid session',
        url: req.originalUrl,
      });
      return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }

    // Check if session is active
    if (session.status !== 'active') {
      securityLogger.logAuthEvent('login_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Session not active',
        url: req.originalUrl,
        sessionStatus: session.status,
      });
      return res.status(401).json({ error: 'Unauthorized: Session not active' });
    }

    // Check session expiration
    const now = Math.floor(Date.now() / 1000);
    if (session.expireAt && session.expireAt < now) {
      securityLogger.logAuthEvent('session_expired', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: session.userId,
        sessionId: session.id,
      });
      return res.status(401).json({ error: 'Unauthorized: Session expired' });
    }

    // Get user
    const clerkUser = await clerk.users.getUser(session.userId);
    if (!clerkUser) {
      securityLogger.logAuthEvent('login_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'User not found',
        url: req.originalUrl,
        userId: session.userId,
      });
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    // Check if user account is active
    if (
      clerkUser.banned ||
      !clerkUser.emailAddresses.some((email) => email.verification.status === 'verified')
    ) {
      securityLogger.logAuthEvent('login_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'User account not active',
        url: req.originalUrl,
        userId: session.userId,
        banned: clerkUser.banned,
        emailVerified: clerkUser.emailAddresses.some(
          (email) => email.verification.status === 'verified'
        ),
      });
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

    // Log successful authentication
    securityLogger.logAuthEvent('login_success', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: localUser.id,
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    securityLogger.logSecurityIncident('auth_system_error', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if authenticated, but doesn't block unauthenticated requests
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Get session token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate session and get user
      const user = await clerkAuthService.getUserBySession(sessionToken);
      if (user) {
        // Attach user to request object
        req.user = user;

        // Log successful optional authentication
        securityLogger.logAuthEvent('login_success', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: user.id,
          email: user.email,
          optional: true,
        });
      } else {
        // Log failed optional authentication
        securityLogger.logAuthEvent('login_failure', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Invalid session in optional auth',
          url: req.originalUrl,
          optional: true,
        });
      }
    }
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    securityLogger.logSecurityIncident('auth_system_error', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      error: error.message,
      stack: error.stack,
      optional: true,
    });
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};
