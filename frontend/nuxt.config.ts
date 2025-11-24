// Nuxt 3 Configuration for JobNaut Frontend
// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
  ],

  // Runtime configuration
  runtimeConfig: {
    public: {
      // Sentry configuration
      sentryDsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      sentryRelease: process.env.SENTRY_RELEASE || 'jobnaut-frontend@1.0.0',

      // API configuration
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
      trpcUrl: process.env.TRPC_URL || 'http://localhost:3001/trpc',
    }
  },

  // CSS configuration
  css: [
    '~/assets/css/main.css',
  ],

  // PostCSS configuration
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  // Build configuration
  build: {
    transpile: ['@ai-sdk/anthropic', '@ai-sdk/openai'],
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./stores/**'],
  },
});
