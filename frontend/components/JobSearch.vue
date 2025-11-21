<template>
  <div class="job-search">
    <div class="search-header">
      <h2 class="search-title">Find Your Dream Job</h2>
      <p class="search-subtitle">Search through thousands of job listings</p>
    </div>

    <div class="search-form">
      <div class="search-input-group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Job title, keywords, or company"
          class="search-input"
          @keyup.enter="performSearch"
        />
        <button @click="performSearch" class="search-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="search-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>

      <div class="search-filters">
        <div class="filter-group">
          <label for="location" class="filter-label">Location</label>
          <select id="location" v-model="locationFilter" class="filter-select">
            <option value="">All Locations</option>
            <option value="remote">Remote</option>
            <option value="san-francisco">San Francisco, CA</option>
            <option value="new-york">New York, NY</option>
            <option value="los-angeles">Los Angeles, CA</option>
            <option value="seattle">Seattle, WA</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="experience" class="filter-label">Experience</label>
          <select id="experience" v-model="experienceFilter" class="filter-select">
            <option value="">All Levels</option>
            <option value="entry">Entry Level</option>
            <option value="mid">Mid Level</option>
            <option value="senior">Senior Level</option>
            <option value="lead">Lead/Principal</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="job-type" class="filter-label">Job Type</label>
          <select id="job-type" v-model="jobTypeFilter" class="filter-select">
            <option value="">All Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        <button @click="clearFilters" class="clear-filters-button">Clear Filters</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue';

// Reactive state
const searchQuery = ref('');
const locationFilter = ref('');
const experienceFilter = ref('');
const jobTypeFilter = ref('');

// Emits
const emit = defineEmits(['search', 'clear-filters']);

// Methods
const performSearch = () => {
  emit('search', {
    query: searchQuery.value,
    location: locationFilter.value,
    experience: experienceFilter.value,
    jobType: jobTypeFilter.value,
  });
};

const clearFilters = () => {
  searchQuery.value = '';
  locationFilter.value = '';
  experienceFilter.value = '';
  jobTypeFilter.value = '';
  emit('clear-filters');
};
</script>

<style scoped>
.job-search {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  margin-bottom: 2rem;
}

.search-header {
  text-align: center;
  margin-bottom: 2rem;
}

.search-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
}

.search-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 1.1rem;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-input-group {
  position: relative;
  display: flex;
}

.search-input {
  flex: 1;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-button {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
}

.search-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.search-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 150px;
}

.filter-label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.filter-select {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-filters-button {
  background-color: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  height: fit-content;
}

.clear-filters-button:hover {
  background-color: #e5e7eb;
}

@media (max-width: 768px) {
  .job-search {
    padding: 1.5rem;
  }

  .search-title {
    font-size: 1.5rem;
  }

  .search-subtitle {
    font-size: 1rem;
  }

  .search-input-group {
    margin-bottom: 1rem;
  }

  .search-input {
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    font-size: 0.95rem;
  }

  .search-button {
    left: 0.75rem;
  }

  .search-icon {
    width: 1.1rem;
    height: 1.1rem;
  }

  .search-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .filter-group {
    min-width: auto;
  }

  .filter-label {
    font-size: 0.8rem;
    margin-bottom: 0.3rem;
  }

  .filter-select {
    padding: 0.6rem;
    font-size: 0.9rem;
  }

  .clear-filters-button {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .job-search {
    padding: 1rem;
  }

  .search-header {
    margin-bottom: 1.5rem;
  }

  .search-title {
    font-size: 1.25rem;
  }

  .search-subtitle {
    font-size: 0.9rem;
  }

  .search-input {
    padding: 0.6rem 0.6rem 0.6rem 2rem;
    font-size: 0.9rem;
  }

  .search-button {
    left: 0.6rem;
  }

  .search-icon {
    width: 1rem;
    height: 1rem;
  }

  .filter-select {
    padding: 0.5rem;
    font-size: 0.85rem;
  }

  .clear-filters-button {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>
