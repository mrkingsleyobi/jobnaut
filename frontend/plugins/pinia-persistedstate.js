import { createPersistedState } from 'pinia-plugin-persistedstate';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(
    createPersistedState({
      storage: process.client ? localStorage : null,
      auto: true, // Enable auto-persistence for stores with persist: true
    })
  );
});
