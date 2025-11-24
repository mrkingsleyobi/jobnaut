import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    isModalOpen: false,
    modalComponent: null,
    modalProps: {},
    toastMessage: null,
    toastType: 'info', // 'info', 'success', 'warning', 'error'
    toastVisible: false,
    globalLoading: false,
    sidebarOpen: false,
    theme: 'light', // 'light' or 'dark'
  }),

  getters: {
    hasActiveToast: (state) => state.toastVisible && state.toastMessage !== null,

    isLightTheme: (state) => state.theme === 'light',

    isDarkTheme: (state) => state.theme === 'dark',
  },

  actions: {
    showToast(message, type = 'info', duration = 3000) {
      this.toastMessage = message;
      this.toastType = type;
      this.toastVisible = true;

      if (duration > 0) {
        setTimeout(() => {
          this.hideToast();
        }, duration);
      }
    },

    hideToast() {
      this.toastVisible = false;
      setTimeout(() => {
        this.toastMessage = null;
        this.toastType = 'info';
      }, 300); // Wait for fade-out animation
    },

    showSuccess(message, duration = 3000) {
      this.showToast(message, 'success', duration);
    },

    showError(message, duration = 4000) {
      this.showToast(message, 'error', duration);
    },

    showWarning(message, duration = 3500) {
      this.showToast(message, 'warning', duration);
    },

    showInfo(message, duration = 3000) {
      this.showToast(message, 'info', duration);
    },

    openModal(component = null, props = {}) {
      this.modalComponent = component;
      this.modalProps = props;
      this.isModalOpen = true;
    },

    closeModal() {
      this.isModalOpen = false;
      setTimeout(() => {
        this.modalComponent = null;
        this.modalProps = {};
      }, 300); // Wait for fade-out animation
    },

    setGlobalLoading(loading) {
      this.globalLoading = loading;
    },

    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },

    openSidebar() {
      this.sidebarOpen = true;
    },

    closeSidebar() {
      this.sidebarOpen = false;
    },

    setTheme(theme) {
      if (theme !== 'light' && theme !== 'dark') {
        console.warn(`Invalid theme: ${theme}. Using 'light' as default.`);
        theme = 'light';
      }
      this.theme = theme;

      // Update document class for CSS theming
      if (process.client) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      }
    },

    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    },
  },

  persist: {
    storage: process.client ? localStorage : null,
    paths: ['theme', 'sidebarOpen'],
  },
});
