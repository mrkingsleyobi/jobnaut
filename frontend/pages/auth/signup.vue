<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
      <div>
        <h2 class="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Join JobNaut and discover your next career opportunity
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSignup">
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

        <!-- Success Message -->
        <div v-if="successMessage" class="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">{{ successMessage }}</p>
            </div>
          </div>
        </div>

        <!-- Full Name Input -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
            :class="{ 'border-red-500': errors.name }"
            placeholder="John Doe"
            @blur="validateName"
            @input="clearError('name')"
          />
          <p v-if="errors.name" class="mt-2 text-sm text-red-600">{{ errors.name }}</p>
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
            @input="clearError('email')"
          />
          <p v-if="errors.email" class="mt-2 text-sm text-red-600">{{ errors.email }}</p>
        </div>

        <!-- Password Input -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
              :class="{ 'border-red-500': errors.password }"
              placeholder="At least 8 characters"
              @blur="validatePassword"
              @input="clearError('password')"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
          <p v-if="errors.password" class="mt-2 text-sm text-red-600">{{ errors.password }}</p>

          <!-- Password Strength Indicator -->
          <div v-if="formData.password" class="mt-2">
            <div class="flex gap-1">
              <div
                v-for="i in 4"
                :key="i"
                class="h-1 flex-1 rounded-full transition-colors"
                :class="passwordStrength >= i ? getStrengthColor(passwordStrength) : 'bg-gray-200'"
              ></div>
            </div>
            <p class="text-xs mt-1" :class="getStrengthTextColor(passwordStrength)">
              {{ getStrengthText(passwordStrength) }}
            </p>
          </div>
        </div>

        <!-- Confirm Password Input -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            required
            class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
            :class="{ 'border-red-500': errors.confirmPassword }"
            placeholder="Confirm your password"
            @blur="validateConfirmPassword"
            @input="clearError('confirmPassword')"
          />
          <p v-if="errors.confirmPassword" class="mt-2 text-sm text-red-600">{{ errors.confirmPassword }}</p>
        </div>

        <!-- Skills Preferences (Optional) -->
        <div>
          <label for="skills" class="block text-sm font-medium text-gray-700 mb-2">
            Skills (Optional)
          </label>
          <input
            id="skills"
            v-model="formData.skills"
            type="text"
            class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
            placeholder="e.g., JavaScript, React, Node.js (comma-separated)"
          />
          <p class="mt-1 text-xs text-gray-500">Add your skills to get personalized job recommendations</p>
        </div>

        <!-- Terms of Service -->
        <div class="flex items-start">
          <input
            id="terms"
            v-model="formData.acceptTerms"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mt-1"
          />
          <label for="terms" class="ml-2 block text-sm text-gray-700 cursor-pointer">
            I agree to the
            <a href="#" class="font-medium text-blue-600 hover:text-blue-500">Terms of Service</a>
            and
            <a href="#" class="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>
          </label>
        </div>
        <p v-if="errors.terms" class="mt-1 text-sm text-red-600">{{ errors.terms }}</p>

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
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </div>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or sign up with</span>
          </div>
        </div>

        <!-- OAuth Buttons -->
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="handleOAuthSignup('google')"
            class="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>

          <button
            type="button"
            @click="handleOAuthSignup('github')"
            class="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </button>
        </div>
      </form>

      <!-- Sign In Link -->
      <div class="text-center">
        <p class="text-sm text-gray-600">
          Already have an account?
          <NuxtLink to="/auth/login" class="font-medium text-blue-600 hover:text-blue-500 transition duration-150">
            Sign in
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';

definePageMeta({
  layout: false,
});

const router = useRouter();
const { signup, loginWithOAuth } = useAuth();

// Form state
const formData = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  skills: '',
  acceptTerms: false,
});

const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: '',
});

// Password strength calculator
const passwordStrength = computed(() => {
  const password = formData.password;
  if (!password) return 0;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  return Math.min(strength, 4);
});

const getStrengthColor = (strength) => {
  if (strength <= 1) return 'bg-red-500';
  if (strength === 2) return 'bg-yellow-500';
  if (strength === 3) return 'bg-blue-500';
  return 'bg-green-500';
};

const getStrengthTextColor = (strength) => {
  if (strength <= 1) return 'text-red-600';
  if (strength === 2) return 'text-yellow-600';
  if (strength === 3) return 'text-blue-600';
  return 'text-green-600';
};

const getStrengthText = (strength) => {
  if (strength <= 1) return 'Weak password';
  if (strength === 2) return 'Fair password';
  if (strength === 3) return 'Good password';
  return 'Strong password';
};

// Validation functions
const validateName = () => {
  if (!formData.name.trim()) {
    errors.name = 'Name is required';
    return false;
  }
  if (formData.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
    return false;
  }
  errors.name = '';
  return true;
};

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

const validatePassword = () => {
  if (!formData.password) {
    errors.password = 'Password is required';
    return false;
  }
  if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
    return false;
  }
  if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password)) {
    errors.password = 'Password must contain both uppercase and lowercase letters';
    return false;
  }
  if (!/[0-9]/.test(formData.password)) {
    errors.password = 'Password must contain at least one number';
    return false;
  }
  errors.password = '';
  return true;
};

const validateConfirmPassword = () => {
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
    return false;
  }
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
    return false;
  }
  errors.confirmPassword = '';
  return true;
};

const clearError = (field) => {
  errors[field] = '';
  errorMessage.value = '';
  successMessage.value = '';
};

// Handle signup
const handleSignup = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  // Validate all fields
  const isNameValid = validateName();
  const isEmailValid = validateEmail();
  const isPasswordValid = validatePassword();
  const isConfirmPasswordValid = validateConfirmPassword();

  // Check terms acceptance
  if (!formData.acceptTerms) {
    errors.terms = 'You must accept the terms of service';
    return;
  }
  errors.terms = '';

  if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
    return;
  }

  loading.value = true;

  try {
    // Parse skills
    const skills = formData.skills
      ? formData.skills.split(',').map(skill => skill.trim()).filter(Boolean)
      : [];

    const result = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      skills,
    });

    if (result.success) {
      successMessage.value = 'Account created successfully! Redirecting...';

      // Redirect to profile page after 1.5 seconds
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } else {
      errorMessage.value = result.error || 'Signup failed. Please try again.';
    }
  } catch (error) {
    console.error('Signup error:', error);
    errorMessage.value = 'An error occurred during signup. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Handle OAuth signup
const handleOAuthSignup = async (provider) => {
  try {
    await loginWithOAuth(provider);
  } catch (error) {
    console.error('OAuth signup error:', error);
    errorMessage.value = `Failed to sign up with ${provider}. Please try again.`;
  }
};
</script>
