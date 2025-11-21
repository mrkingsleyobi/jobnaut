<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl text-center">
      <!-- Loading State -->
      <div v-if="loading">
        <div class="flex justify-center mb-4">
          <svg class="animate-spin h-16 w-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Authenticating...</h2>
        <p class="text-gray-600">Please wait while we complete your authentication</p>
      </div>

      <!-- Success State -->
      <div v-else-if="success && !loading">
        <div class="flex justify-center mb-4">
          <svg class="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Authentication Successful!</h2>
        <p class="text-gray-600 mb-4">Redirecting you to your profile...</p>
        <div class="flex justify-center">
          <div class="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-blue-600 animate-progress"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error">
        <div class="flex justify-center mb-4">
          <svg class="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
        <p class="text-gray-600 mb-6">{{ errorMessage }}</p>

        <div class="space-y-3">
          <button
            @click="retryAuth"
            class="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            Try Again
          </button>

          <NuxtLink
            to="/auth/login"
            class="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            Back to Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '~/composables/useAuth';

definePageMeta({
  layout: false,
});

const router = useRouter();
const route = useRoute();
const { handleOAuthCallback } = useAuth();

const loading = ref(true);
const success = ref(false);
const error = ref(false);
const errorMessage = ref('');

// Process OAuth callback
const processCallback = async () => {
  loading.value = true;
  error.value = false;
  success.value = false;

  try {
    // Extract callback parameters from URL
    const code = route.query.code;
    const state = route.query.state;
    const errorParam = route.query.error;
    const errorDescription = route.query.error_description;

    // Check for errors from OAuth provider
    if (errorParam) {
      throw new Error(errorDescription || errorParam || 'Authentication failed');
    }

    // Validate required parameters
    if (!code) {
      throw new Error('Missing authentication code');
    }

    // Process the OAuth callback
    const result = await handleOAuthCallback({
      code,
      state,
    });

    if (result.success) {
      success.value = true;

      // Redirect to profile after 2 seconds
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } else {
      throw new Error(result.error || 'Authentication failed');
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    error.value = true;
    errorMessage.value = err.message || 'An unexpected error occurred during authentication';
  } finally {
    loading.value = false;
  }
};

// Retry authentication
const retryAuth = () => {
  router.push('/auth/login');
};

// Process callback on mount
onMounted(() => {
  processCallback();
});
</script>

<style scoped>
@keyframes progress {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

.animate-progress {
  animation: progress 2s ease-in-out;
}
</style>
