<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
      <div>
        <h2 class="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <form v-if="!emailSent" class="mt-8 space-y-6" @submit.prevent="handleResetPassword">
        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ errorMessage }}</p>
            </div>
          </div>
        </div>

        <!-- Email Input -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            required
            class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
            :class="{ 'border-red-500': errors.email }"
            placeholder="you@example.com"
            @blur="validateEmail"
            @input="clearError"
          />
          <p v-if="errors.email" class="mt-2 text-sm text-red-600">{{ errors.email }}</p>
        </div>

        <!-- Submit Button -->
        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </button>
        </div>
      </form>

      <!-- Success State -->
      <div v-else class="mt-8 space-y-6">
        <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">Email sent successfully!</h3>
              <p class="mt-2 text-sm text-green-700">
                We've sent a password reset link to <strong>{{ formData.email }}</strong>.
                Please check your inbox and follow the instructions.
              </p>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm text-blue-700">
                Didn't receive the email? Check your spam folder or
                <button
                  @click="resendEmail"
                  :disabled="resendDisabled"
                  class="font-medium underline hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ resendDisabled ? `resend in ${countdown}s` : 'resend' }}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div>
          <NuxtLink
            to="/auth/login"
            class="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            <svg class="h-5 w-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to login
          </NuxtLink>
        </div>
      </div>

      <!-- Back to Login Link (when form is shown) -->
      <div v-if="!emailSent" class="text-center">
        <p class="text-sm text-gray-600">
          Remember your password?
          <NuxtLink to="/auth/login" class="font-medium text-blue-600 hover:text-blue-500 transition duration-150">
            Sign in
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useAuth } from '~/composables/useAuth';

definePageMeta({
  layout: false,
});

const { resetPassword } = useAuth();

// Form state
const formData = reactive({
  email: '',
});

const loading = ref(false);
const errorMessage = ref('');
const errors = reactive({
  email: '',
});

const emailSent = ref(false);
const resendDisabled = ref(false);
const countdown = ref(60);
let countdownInterval = null;

// Validation
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email) {
    errors.email = 'Email is required';
    return false;
  }
  if (!emailRegex.test(formData.email)) {
    errors.email = 'Please enter a valid email address';
    return false;
  }
  errors.email = '';
  return true;
};

const clearError = () => {
  errors.email = '';
  errorMessage.value = '';
};

// Handle password reset
const handleResetPassword = async () => {
  errorMessage.value = '';

  if (!validateEmail()) {
    return;
  }

  loading.value = true;

  try {
    const result = await resetPassword(formData.email);

    if (result.success) {
      emailSent.value = true;
      startResendCountdown();
    } else {
      errorMessage.value = result.error || 'Failed to send reset link. Please try again.';
    }
  } catch (error) {
    console.error('Password reset error:', error);
    errorMessage.value = 'An error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Resend email functionality
const resendEmail = async () => {
  if (resendDisabled.value) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await resetPassword(formData.email);

    if (result.success) {
      startResendCountdown();
    } else {
      errorMessage.value = result.error || 'Failed to resend email. Please try again.';
    }
  } catch (error) {
    console.error('Resend email error:', error);
    errorMessage.value = 'An error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
};

const startResendCountdown = () => {
  resendDisabled.value = true;
  countdown.value = 60;

  countdownInterval = setInterval(() => {
    countdown.value--;

    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      resendDisabled.value = false;
    }
  }, 1000);
};

// Cleanup on component unmount
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});
</script>
