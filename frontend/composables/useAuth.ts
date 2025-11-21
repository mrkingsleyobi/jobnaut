import { ref, computed } from 'vue';
import type { Ref } from 'vue';

interface User {
  id: string;
  email: string;
  name: string;
  skills?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  skills?: string[];
}

interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Global auth state (you can also use Pinia for more complex state management)
const authState: Ref<AuthState> = ref({
  user: null,
  isAuthenticated: false,
  loading: false,
});

export const useAuth = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  // Computed properties
  const isAuthenticated = computed(() => authState.value.isAuthenticated);
  const currentUser = computed(() => authState.value.user);
  const loading = computed(() => authState.value.loading);

  // Initialize auth state from localStorage/cookies
  const initAuth = () => {
    if (process.client) {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          authState.value.user = user;
          authState.value.isAuthenticated = true;
        } catch (error) {
          console.error('Error parsing user data:', error);
          clearAuth();
        }
      }
    }
  };

  // Clear auth state
  const clearAuth = () => {
    if (process.client) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
    authState.value.user = null;
    authState.value.isAuthenticated = false;
  };

  // Save auth state
  const saveAuth = (token: string, user: User) => {
    if (process.client) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    authState.value.user = user;
    authState.value.isAuthenticated = true;
  };

  // Login with email/password
  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    authState.value.loading = true;

    try {
      // TODO: Replace with actual Clerk authentication
      // For now, using mock implementation
      const response = await $fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        body: credentials,
      });

      if (response.success && response.token && response.user) {
        saveAuth(response.token, response.user);
        return { success: true, user: response.user };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during login'
      };
    } finally {
      authState.value.loading = false;
    }
  };

  // Signup with email/password
  const signup = async (data: SignupData): Promise<AuthResponse> => {
    authState.value.loading = true;

    try {
      // TODO: Replace with actual Clerk user creation
      // For now, using mock implementation
      const response = await $fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        body: data,
      });

      if (response.success && response.token && response.user) {
        saveAuth(response.token, response.user);
        return { success: true, user: response.user };
      }

      return { success: false, error: response.error || 'Signup failed' };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during signup'
      };
    } finally {
      authState.value.loading = false;
    }
  };

  // Login with OAuth (Google, GitHub, etc.)
  const loginWithOAuth = async (provider: string) => {
    try {
      // TODO: Implement Clerk OAuth
      // For now, redirect to a mock OAuth URL
      const redirectUri = `${window.location.origin}/auth/callback`;
      const oauthUrl = `${apiBase}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;

      // Redirect to OAuth provider
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  };

  // Handle OAuth callback
  const handleOAuthCallback = async ({ code, state }: { code: string; state?: string }): Promise<AuthResponse> => {
    authState.value.loading = true;

    try {
      // TODO: Replace with actual Clerk OAuth callback handling
      const response = await $fetch(`${apiBase}/auth/oauth/callback`, {
        method: 'POST',
        body: { code, state },
      });

      if (response.success && response.token && response.user) {
        saveAuth(response.token, response.user);
        return { success: true, user: response.user };
      }

      return { success: false, error: response.error || 'OAuth authentication failed' };
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during authentication'
      };
    } finally {
      authState.value.loading = false;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<AuthResponse> => {
    try {
      // TODO: Replace with actual Clerk password reset
      const response = await $fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        body: { email },
      });

      return {
        success: response.success || true,
        error: response.error,
      };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while sending reset link'
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      // TODO: Call Clerk logout
      // For now, just clear local state
      clearAuth();

      // Optionally call backend to invalidate token
      await $fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
      }).catch(() => {
        // Ignore errors on logout
      });

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      clearAuth();
      return { success: false };
    }
  };

  // Check if user is authenticated (for middleware)
  const checkAuth = (): boolean => {
    if (process.client) {
      const token = localStorage.getItem('auth_token');
      return !!token;
    }
    return false;
  };

  // Get auth token
  const getToken = (): string | null => {
    if (process.client) {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Initialize on composable creation
  if (process.client) {
    initAuth();
  }

  return {
    // State
    isAuthenticated,
    currentUser,
    loading,

    // Methods
    login,
    signup,
    loginWithOAuth,
    handleOAuthCallback,
    resetPassword,
    logout,
    checkAuth,
    getToken,
    initAuth,
  };
};
