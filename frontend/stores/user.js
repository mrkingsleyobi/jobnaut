import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
  }),

  getters: {
    fullName: (state) => {
      if (!state.user) return '';
      return `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim();
    },

    skillsList: (state) => {
      if (!state.user || !state.user.skills) return [];
      return state.user.skills;
    },

    userProfile: (state) => state.user,

    isLoggedIn: (state) => state.isAuthenticated && state.user !== null,
  },

  actions: {
    async login(credentials) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const response = await fetch(`${config.public.apiBase}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const data = await response.json();
        this.user = data.user;
        this.isAuthenticated = true;

        // Store token in localStorage
        if (process.client) {
          localStorage.setItem('auth_token', data.token);
        }

        return data;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        // Clear user data
        this.user = null;
        this.isAuthenticated = false;

        // Clear token from localStorage
        if (process.client) {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfile(userId) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const token = process.client ? localStorage.getItem('auth_token') : null;

        const response = await fetch(`${config.public.apiBase}/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        this.user = data;
        this.isAuthenticated = true;

        return data;
      } catch (error) {
        console.error('Fetch profile error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateProfile(userId, updates) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const token = process.client ? localStorage.getItem('auth_token') : null;

        const response = await fetch(`${config.public.apiBase}/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update profile');
        }

        const data = await response.json();
        this.user = { ...this.user, ...data };

        return data;
      } catch (error) {
        console.error('Update profile error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    addSkill(skill) {
      if (!this.user) return;

      if (!this.user.skills) {
        this.user.skills = [];
      }

      if (!this.user.skills.includes(skill)) {
        this.user.skills.push(skill);
      }
    },

    removeSkill(skill) {
      if (!this.user || !this.user.skills) return;

      const index = this.user.skills.indexOf(skill);
      if (index > -1) {
        this.user.skills.splice(index, 1);
      }
    },

    setUser(user) {
      this.user = user;
      this.isAuthenticated = !!user;
    },

    clearUser() {
      this.user = null;
      this.isAuthenticated = false;
    },
  },

  persist: {
    storage: process.client ? localStorage : null,
    paths: ['user', 'isAuthenticated'],
  },
});
