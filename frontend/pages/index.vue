<template>
  <div class="home">
    <section class="hero">
      <h1>Find Your Dream Job with JobNaut</h1>
      <p>AI-Powered Job Market Navigator</p>
      <NuxtLink to="/jobs" class="cta-button">Explore Jobs</NuxtLink>
    </section>

    <section class="features">
      <h2>Features</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <h3>Smart Search</h3>
          <p>Find jobs with intelligent search powered by AI</p>
        </div>
        <div class="feature-card">
          <h3>Personalized Recommendations</h3>
          <p>Get job recommendations based on your skills</p>
        </div>
        <div class="feature-card">
          <h3>Real-time Updates</h3>
          <p>Stay updated with the latest job postings</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
// Home page component
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.cta-button {
  display: inline-block;
  background-color: #fff;
  color: #667eea;
  padding: 1rem 2rem;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: transform 0.3s;
}

.cta-button:hover {
  transform: translateY(-2px);
}

.features {
  padding: 2rem 0;
}

.features h2 {
  text-align: center;
  margin-bottom: 2rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.feature-card h3 {
  margin-top: 0;
  color: #2c3e50;
}
</style>
