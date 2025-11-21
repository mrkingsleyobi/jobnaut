<template>
  <div class="layout">
    <header class="header">
      <nav class="navbar">
        <div class="nav-brand">
          <h1>JobNaut</h1>
        </div>
        <div class="nav-links">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/jobs">Jobs</NuxtLink>
          <NuxtLink to="/profile">Profile</NuxtLink>
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
// Default layout component
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
