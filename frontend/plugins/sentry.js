// Sentry Error Tracking Configuration for JobNaut Frontend
// Nuxt 3 plugin for client-side error tracking

import * as Sentry from '@sentry/vue';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const router = useRouter();

  const dsn = config.public.sentryDsn;
  const environment = config.public.environment || 'development';
  const release = config.public.sentryRelease || 'jobnaut-frontend@1.0.0';

  // Only initialize if DSN is provided
  if (!dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn,
    environment,
    release,

    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        // Session Replay configuration
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/yourapi\.domain\.com/,
      /^https:\/\/api\.jobnaut\.com/,
    ],

    // Session Replay sample rate
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development (optional)
      if (environment === 'development') {
        console.error('Sentry would send:', event);
        return null; // Comment this line to send events in development
      }

      // Remove sensitive data from request
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }

        if (event.request.cookies) {
          delete event.request.cookies;
        }
      }

      // Scrub sensitive form data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.category === 'ui.input') {
            breadcrumb.message = '[Filtered]';
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      // Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      // Random plugins/extensions
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // User cancellations
      'Navigation cancelled',
      'Navigation aborted',
    ],

    // Ignore specific URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
    ],
  });

  // Set user context when authenticated
  nuxtApp.hook('app:mounted', () => {
    const authStore = useAuthStore?.();
    if (authStore?.user) {
      Sentry.setUser({
        id: authStore.user.id,
        email: authStore.user.email,
        username: authStore.user.username,
      });
    }
  });

  // Add global error handler
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    Sentry.captureException(error, {
      contexts: {
        vue: {
          componentName: instance?.$options?.name || 'Unknown',
          propsData: instance?.$props,
          info,
        },
      },
    });

    // Re-throw in development
    if (environment === 'development') {
      console.error('Vue error:', error, info);
    }
  };

  // Provide Sentry instance globally
  return {
    provide: {
      sentry: Sentry,
    },
  };
});
