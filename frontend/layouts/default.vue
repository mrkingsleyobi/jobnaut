<template>
  <div class="layout">
    <header class="header">
      <nav class="navbar">
        <div class="nav-brand">
          <NuxtLink to="/" class="brand-link">
            <h1>JobNaut</h1>
          </NuxtLink>
        </div>
        <div class="nav-links">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/jobs">Jobs</NuxtLink>

          <!-- Show based on authentication status -->
          <template v-if="isAuthenticated">
            <NuxtLink to="/profile">Profile</NuxtLink>

            <!-- User Menu Dropdown -->
            <div class="user-menu" @click.stop="toggleUserMenu">
              <button class="user-menu-button">
                <div class="user-avatar">
                  {{ userInitials }}
                </div>
                <svg
                  class="dropdown-icon"
                  :class="{ 'rotate-180': showUserMenu }"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div v-if="showUserMenu" class="user-dropdown">
                <div class="user-info">
                  <p class="user-name">{{ currentUser?.name }}</p>
                  <p class="user-email">{{ currentUser?.email }}</p>
                </div>
                <div class="dropdown-divider"></div>
                <NuxtLink to="/profile" class="dropdown-item" @click="closeUserMenu">
                  <svg class="dropdown-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Your Profile
                </NuxtLink>
                <NuxtLink to="/saved-jobs" class="dropdown-item" @click="closeUserMenu">
                  <svg class="dropdown-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Saved Jobs
                </NuxtLink>
                <div class="dropdown-divider"></div>
                <button @click="handleLogout" class="dropdown-item logout-item">
                  <svg class="dropdown-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </template>

          <!-- Auth buttons for non-authenticated users -->
          <template v-else>
            <NuxtLink to="/auth/login" class="auth-link login-link">Login</NuxtLink>
            <NuxtLink to="/auth/signup" class="auth-link signup-link">Sign Up</NuxtLink>
          </template>
        </div>
      </nav>
    </header>
    <main class="main-content">
      <slot />
    </main>
    <footer class="footer">
      <p>&copy; 2025 JobNaut. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';

const router = useRouter();
const { isAuthenticated, currentUser, logout } = useAuth();

const showUserMenu = ref(false);

// Compute user initials for avatar
const userInitials = computed(() => {
  if (!currentUser.value?.name) return 'U';

  const names = currentUser.value.name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return currentUser.value.name.substring(0, 2).toUpperCase();
});

// Toggle user menu
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const closeUserMenu = () => {
  showUserMenu.value = false;
};

// Handle logout
const handleLogout = async () => {
  closeUserMenu();
  await logout();
  router.push('/');
};

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu');
  if (userMenu && !userMenu.contains(event.target)) {
    closeUserMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand h1 {
  margin: 0;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
  font-size: 1rem;
}

.nav-links a:hover {
  background-color: #34495e;
}

.nav-links a.nuxt-link-exact-active {
  background-color: #34495e;
}

.main-content {
  flex: 1;
  padding: 2rem;
}

.footer {
  background-color: #34495e;
  color: white;
  text-align: center;
  padding: 1rem;
}

/* Auth Links */
.auth-link {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
}

.login-link {
  color: white;
}

.login-link:hover {
  background-color: #34495e;
}

.signup-link {
  background-color: #3b82f6;
  color: white;
}

.signup-link:hover {
  background-color: #2563eb;
}

.brand-link {
  color: white;
  text-decoration: none;
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-menu-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 9999px;
  transition: background-color 0.2s;
}

.user-menu-button:hover {
  background-color: #34495e;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

.rotate-180 {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  z-index: 50;
  overflow: hidden;
}

.user-info {
  padding: 1rem;
  background-color: #f9fafb;
}

.user-name {
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
}

.user-email {
  color: #6b7280;
  margin: 0;
  font-size: 0.75rem;
  word-break: break-all;
}

.dropdown-divider {
  height: 1px;
  background-color: #e5e7eb;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
}

.dropdown-item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.logout-item {
  color: #dc2626;
}

.logout-item:hover {
  background-color: #fef2f2;
}

@media (max-width: 768px) {
  .header {
    padding: 0.75rem;
  }

  .navbar {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .nav-brand {
    text-align: center;
  }

  .nav-brand h1 {
    font-size: 1.25rem;
  }

  .nav-links {
    gap: 0.5rem;
    justify-content: center;
  }

  .nav-links a {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }

  .main-content {
    padding: 1rem;
  }

  .footer {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0.5rem;
  }

  .nav-brand h1 {
    font-size: 1.1rem;
  }

  .nav-links {
    flex-wrap: wrap;
  }

  .nav-links a {
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
  }

  .main-content {
    padding: 0.75rem;
  }

  .footer {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
}
</style>
