// Sentry Error Tracking Configuration for JobNaut Backend
// Provides comprehensive error tracking and performance monitoring

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry for error tracking
 * @param {Object} app - Express app instance
 */
function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || 'jobnaut@1.0.0';

  // Only initialize if DSN is provided
  if (!dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Set sample rate for performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Set profiling sample rate
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),

      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),

      // Enable profiling
      new ProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in test environment
      if (process.env.NODE_ENV === 'test') {
        return null;
      }

      // Remove sensitive headers
      if (event.request && event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive query parameters
      if (event.request && event.request.query_string) {
        event.request.query_string = event.request.query_string
          .replace(/token=[^&]+/gi, 'token=[FILTERED]')
          .replace(/password=[^&]+/gi, 'password=[FILTERED]');
      }

      return event;
    },

    // Ignore common errors that don't need tracking
    ignoreErrors: [
      'CORS',
      'Not allowed by CORS',
      'Too many requests',
      'Network request failed',
      'NetworkError',
    ],
  });

  // Request handler must be the first middleware
  if (app) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  console.log(`Sentry initialized for environment: ${environment}`);
}

/**
 * Get Sentry error handler middleware
 * Must be registered after all routes but before other error handlers
 */
function getSentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 5xx errors
      if (error.status && error.status >= 500) {
        return true;
      }
      // Capture specific error types
      return true;
    },
  });
}

/**
 * Manually capture an exception
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
function captureException(error, context = {}) {
  Sentry.captureException(error, {
    tags: context.tags,
    extra: context.extra,
    user: context.user,
  });
}

/**
 * Set user context for error tracking
 * @param {Object} user - User information
 */
function setUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}

/**
 * Create a Sentry transaction for performance monitoring
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @param {Function} callback - Function to execute within transaction
 */
async function withTransaction(name, op, callback) {
  const transaction = Sentry.startTransaction({
    name,
    op,
  });

  try {
    const result = await callback(transaction);
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

module.exports = {
  initSentry,
  getSentryErrorHandler,
  captureException,
  setUser,
  addBreadcrumb,
  withTransaction,
  Sentry,
};
