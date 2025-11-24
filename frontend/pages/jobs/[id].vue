<template>
  <div class="job-details-page">
    <div v-if="loading" class="loading">Loading job details...</div>
    <div v-else-if="job" class="job-details">
      <div class="job-header">
        <div class="job-basic-info">
          <h1 class="job-title">{{ job.title }}</h1>
          <p class="job-company">{{ job.company }}</p>
          <p class="job-location">{{ job.location }}</p>
        </div>

        <div class="job-actions">
          <button
            @click="toggleSaveJob"
            class="action-button save-button"
            :class="{ saved: isSaved }"
          >
            {{ isSaved ? 'Saved' : 'Save Job' }}
          </button>
          <button @click="applyToJob" class="action-button apply-button">Apply Now</button>
        </div>
      </div>

      <div class="job-content">
        <div class="job-section">
          <h2 class="section-title">Job Description</h2>
          <div class="job-description">
            <p>{{ job.description }}</p>
          </div>
        </div>

        <div class="job-section">
          <h2 class="section-title">Requirements</h2>
          <div class="job-requirements">
            <ul class="requirements-list">
              <li v-for="(skill, index) in job.skills" :key="index" class="requirement-item">
                {{ skill }}
              </li>
            </ul>
          </div>
        </div>

        <div class="job-section">
          <h2 class="section-title">Job Details</h2>
          <div class="job-details-grid">
            <div class="detail-item">
              <span class="detail-label">Posted Date:</span>
              <span class="detail-value">{{ formatDate(job.postedDate) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Experience Level:</span>
              <span class="detail-value">Mid Level</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Job Type:</span>
              <span class="detail-value">Full-time</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Remote:</span>
              <span class="detail-value">{{ job.location.includes('Remote') ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <div class="job-section" v-if="similarJobs.length > 0">
          <h2 class="section-title">Similar Jobs</h2>
          <div class="similar-jobs-grid">
            <JobCard
              v-for="similarJob in similarJobs"
              :key="similarJob.id"
              :job="similarJob"
              :is-saved="isJobSaved(similarJob.id)"
              @view-details="viewJobDetails"
              @save="toggleSaveJob"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-else class="error">Job not found</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import JobCard from '../../components/JobCard.vue';
import trpc from '../../src/api/trpcClient';

// Route and router
const route = useRoute();
const router = useRouter();

// Reactive state
const job = ref(null);
const loading = ref(true);
const isSaved = ref(false);
const savedJobs = ref(new Set());
const similarJobs = ref([]);

// Methods
const loadJobDetails = async () => {
  const jobId = route.params.id;
  loading.value = true;

  try {
    // Fetch job details from backend using tRPC
    const jobData = await trpc.jobs.getById.query({ id: parseInt(jobId) });
    job.value = jobData;

    // Check if job is saved
    isSaved.value = savedJobs.value.has(parseInt(jobId));

    // Fetch similar jobs (using search with job title as query)
    if (jobData.title) {
      const searchResult = await trpc.jobs.search.query({
        query: jobData.title,
        limit: 4,
        offset: 0,
      });

      // Filter out the current job and take first 2
      similarJobs.value = searchResult.jobs
        .filter((j) => j.id !== jobData.id)
        .slice(0, 2)
        .map((j) => ({
          ...j,
          postedDate: j.postedDate || new Date().toISOString(),
        }));
    }
  } catch (error) {
    console.error('Error loading job details:', error);
  } finally {
    loading.value = false;
  }
};

const toggleSaveJob = () => {
  const jobId = job.value.id;
  if (savedJobs.value.has(jobId)) {
    savedJobs.value.delete(jobId);
    isSaved.value = false;
  } else {
    savedJobs.value.add(jobId);
    isSaved.value = true;
  }
  console.log('Job saved status:', isSaved.value);
};

const applyToJob = () => {
  // Apply to job
  if (job.value && job.value.applicationLink) {
    window.open(job.value.applicationLink, '_blank');
  } else {
    alert('Application link not available');
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

const isJobSaved = (jobId) => {
  return savedJobs.value.has(jobId);
};

const viewJobDetails = (jobId) => {
  router.push(`/jobs/${jobId}`);
};

// Load job details on component mount
onMounted(() => {
  loadJobDetails();
});
</script>

<style scoped>
.job-details-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading,
.error {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
}

.loading {
  color: #6b7280;
}

.error {
  color: #ef4444;
}

.job-details {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.job-header {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.job-basic-info {
  flex: 1;
}

.job-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
}

.job-company {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  opacity: 0.9;
}

.job-location {
  font-size: 1rem;
  opacity: 0.8;
}

.job-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-button {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.save-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.save-button.saved {
  background-color: #10b981;
  color: white;
}

.apply-button {
  background-color: white;
  color: #3b82f6;
}

.apply-button:hover {
  background-color: #f3f4f6;
}

.job-content {
  padding: 2rem;
}

.job-section {
  margin-bottom: 2rem;
}

.job-section:last-child {
  margin-bottom: 0;
}

.section-title {
  color: #111827;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 0.5rem;
}

.job-description p {
  line-height: 1.7;
  color: #374151;
  margin: 0;
}

.job-requirements {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
}

.requirements-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.requirement-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
  display: flex;
  align-items: center;
}

.requirement-item:last-child {
  border-bottom: none;
}

.requirement-item::before {
  content: '•';
  color: #3b82f6;
  font-weight: bold;
  display: inline-block;
  width: 1em;
  margin-right: 0.5em;
}

.job-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.detail-value {
  color: #111827;
}

.similar-jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .job-details-page {
    padding: 1rem;
  }

  .job-header {
    padding: 1.5rem;
  }

  .job-title {
    font-size: 1.5rem;
  }

  .job-company {
    font-size: 1.1rem;
  }

  .job-actions {
    width: 100%;
  }

  .action-button {
    flex: 1;
    justify-content: center;
  }

  .job-content {
    padding: 1.5rem;
  }

  .job-details-grid {
    grid-template-columns: 1fr;
  }

  .similar-jobs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
