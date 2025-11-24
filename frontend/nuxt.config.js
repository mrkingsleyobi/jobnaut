// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  modules: [
    '@pinia/nuxt',
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/api',
      meilisearchHost: process.env.NUXT_PUBLIC_MEILISEARCH_HOST || 'http://localhost:7700',
      meilisearchKey: process.env.NUXT_PUBLIC_MEILISEARCH_KEY || '',
    }
  }
})