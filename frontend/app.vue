<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Main app component
</script>

<style>
/* Global styles */
body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  line-height: 1.6;
  font-size: 16px;
  color: #333;
}

* {
  box-sizing: border-box;
}

/* Improved touch targets for mobile */
button,
a,
input,
select {
  min-height: 44px;
  min-width: 44px;
}

/* Focus states for accessibility */
button:focus,
a:focus,
input:focus,
select:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Responsive images */
img {
  max-width: 100%;
  height: auto;
}

/* Typography improvements */
h1,
h2,
h3,
h4,
h5,
h6 {
  line-height: 1.3;
  margin-top: 0;
}

p {
  margin-top: 0;
  margin-bottom: 1rem;
}

/* Mobile-first responsive utilities */
@media (max-width: 768px) {
  body {
    font-size: 15px;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  h3 {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  body {
    font-size: 14px;
  }

  h1 {
    font-size: 1.5rem;
  }

  h2 {
    font-size: 1.3rem;
  }

  h3 {
    font-size: 1.15rem;
  }

  /* Reduce minimum touch targets on very small screens */
  button,
  a,
  input,
  select {
    min-height: 36px;
    min-width: 36px;
  }
}
</style>
