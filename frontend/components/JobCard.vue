<template>
  <div class="job-card" @click="$emit('view-details', job.id)">
    <div class="job-header">
      <h3 class="job-title">{{ job.title }}</h3>
      <p class="job-company">{{ job.company }}</p>
    </div>

    <div class="job-details">
      <p class="job-location">{{ job.location }}</p>
      <p class="job-description">{{ truncatedDescription }}</p>

      <div class="job-skills">
        <span v-for="skill in displayedSkills" :key="skill" class="skill-tag">
          {{ skill }}
        </span>
        <span v-if="job.skills.length > 3" class="more-skills">
          +{{ job.skills.length - 3 }} more
        </span>
      </div>

      <p class="job-posted">Posted: {{ formatDate(job.postedDate) }}</p>
    </div>

    <div class="job-actions">
      <button @click.stop="$emit('save', job.id)" class="save-button" :class="{ saved: isSaved }">
        {{ isSaved ? 'Saved' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  job: {
    type: Object,
    required: true,
  },
  isSaved: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['view-details', 'save']);

// Computed properties
const truncatedDescription = computed(() => {
  if (!props.job.description) return '';
  return props.job.description.length > 100
    ? props.job.description.substring(0, 100) + '...'
    : props.job.description;
});

const displayedSkills = computed(() => {
  return props.job.skills ? props.job.skills.slice(0, 3) : [];
});

// Methods
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};
</script>

<style scoped>
.job-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border: 1px solid #e1e5e9;
}

.job-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.job-header {
  margin-bottom: 1rem;
}

.job-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: #1a1a1a;
  font-weight: 600;
  line-height: 1.3;
}

.job-company {
  margin: 0;
  color: #3b82f6;
  font-weight: 500;
}

.job-details {
  margin-bottom: 1rem;
}

.job-location {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.job-description {
  margin: 0 0 1rem 0;
  color: #374151;
  line-height: 1.5;
}

.job-skills {
  margin: 0 0 1rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill-tag {
  background-color: #eff6ff;
  color: #1d4ed8;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.more-skills {
  background-color: #f3f4f6;
  color: #6b7280;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.job-posted {
  margin: 0;
  color: #9ca3af;
  font-size: 0.85rem;
}

.job-actions {
  display: flex;
  justify-content: flex-end;
}

.save-button {
  background-color: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  text-align: center;
}

.save-button:hover {
  background-color: #e5e7eb;
}

.save-button.saved {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.save-button.saved:hover {
  background-color: #bfdbfe;
}

@media (max-width: 768px) {
  .job-card {
    padding: 1rem;
    border-radius: 6px;
  }

  .job-title {
    font-size: 1.1rem;
  }

  .job-company {
    font-size: 0.95rem;
  }

  .job-location {
    font-size: 0.85rem;
  }

  .job-description {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .skill-tag,
  .more-skills {
    padding: 0.2rem 0.6rem;
    font-size: 0.75rem;
  }

  .job-posted {
    font-size: 0.8rem;
  }

  .save-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    min-width: 70px;
  }
}

@media (max-width: 480px) {
  .job-card {
    padding: 0.75rem;
  }

  .job-title {
    font-size: 1rem;
  }

  .job-company {
    font-size: 0.9rem;
  }

  .job-details {
    margin-bottom: 0.75rem;
  }

  .job-description {
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .skill-tag,
  .more-skills {
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
  }

  .save-button {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    min-width: 60px;
  }
}
</style>
