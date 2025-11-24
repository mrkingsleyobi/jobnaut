import { defineStore } from 'pinia';

export const useJobsStore = defineStore('jobs', {
  state: () => ({
    jobs: [],
    savedJobs: [],
    currentJob: null,
    filters: {
      query: '',
      location: '',
      experience: '',
      jobType: '',
    },
    loading: false,
    totalResults: 0,
    currentPage: 1,
    pageSize: 20,
  }),

  getters: {
    filteredJobs: (state) => {
      let filtered = [...state.jobs];

      if (state.filters.query) {
        const query = state.filters.query.toLowerCase();
        filtered = filtered.filter(
          (job) =>
            job.title?.toLowerCase().includes(query) ||
            job.company?.toLowerCase().includes(query) ||
            job.description?.toLowerCase().includes(query)
        );
      }

      if (state.filters.location) {
        filtered = filtered.filter(
          (job) => job.location?.toLowerCase() === state.filters.location.toLowerCase()
        );
      }

      if (state.filters.experience) {
        filtered = filtered.filter(
          (job) => job.experienceLevel?.toLowerCase() === state.filters.experience.toLowerCase()
        );
      }

      if (state.filters.jobType) {
        filtered = filtered.filter(
          (job) => job.type?.toLowerCase() === state.filters.jobType.toLowerCase()
        );
      }

      return filtered;
    },

    savedJobIds: (state) => {
      return new Set(state.savedJobs.map((job) => job.id || job._id));
    },

    isJobSaved: (state) => (jobId) => {
      return state.savedJobIds.has(jobId);
    },

    jobCount: (state) => state.jobs.length,

    savedJobCount: (state) => state.savedJobs.length,
  },

  actions: {
    async searchJobs(searchParams = {}) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();

        // Build query string
        const params = new URLSearchParams();
        if (searchParams.query) params.append('q', searchParams.query);
        if (searchParams.location) params.append('location', searchParams.location);
        if (searchParams.experience) params.append('experience', searchParams.experience);
        if (searchParams.jobType) params.append('type', searchParams.jobType);
        if (searchParams.page) params.append('page', searchParams.page);
        if (searchParams.limit) params.append('limit', searchParams.limit);

        const response = await fetch(`${config.public.apiBase}/jobs/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to search jobs');
        }

        const data = await response.json();
        this.jobs = data.jobs || data.hits || data;
        this.totalResults = data.total || data.estimatedTotalHits || this.jobs.length;

        // Update filters
        if (searchParams.query !== undefined) this.filters.query = searchParams.query;
        if (searchParams.location !== undefined) this.filters.location = searchParams.location;
        if (searchParams.experience !== undefined) this.filters.experience = searchParams.experience;
        if (searchParams.jobType !== undefined) this.filters.jobType = searchParams.jobType;

        return this.jobs;
      } catch (error) {
        console.error('Search jobs error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getJobById(jobId) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const response = await fetch(`${config.public.apiBase}/jobs/${jobId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch job');
        }

        const job = await response.json();
        this.currentJob = job;

        return job;
      } catch (error) {
        console.error('Get job error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async saveJob(job) {
      try {
        const config = useRuntimeConfig();
        const token = process.client ? localStorage.getItem('auth_token') : null;

        const response = await fetch(`${config.public.apiBase}/users/saved-jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ jobId: job.id || job._id }),
        });

        if (!response.ok) {
          throw new Error('Failed to save job');
        }

        // Add to saved jobs if not already present
        const jobId = job.id || job._id;
        if (!this.savedJobIds.has(jobId)) {
          this.savedJobs.push(job);
        }

        return true;
      } catch (error) {
        console.error('Save job error:', error);
        throw error;
      }
    },

    async unsaveJob(jobId) {
      try {
        const config = useRuntimeConfig();
        const token = process.client ? localStorage.getItem('auth_token') : null;

        const response = await fetch(`${config.public.apiBase}/users/saved-jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to unsave job');
        }

        // Remove from saved jobs
        this.savedJobs = this.savedJobs.filter((job) => {
          const id = job.id || job._id;
          return id !== jobId;
        });

        return true;
      } catch (error) {
        console.error('Unsave job error:', error);
        throw error;
      }
    },

    async getSavedJobs() {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const token = process.client ? localStorage.getItem('auth_token') : null;

        const response = await fetch(`${config.public.apiBase}/users/saved-jobs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch saved jobs');
        }

        const data = await response.json();
        this.savedJobs = data.savedJobs || data;

        return this.savedJobs;
      } catch (error) {
        console.error('Get saved jobs error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
    },

    clearFilters() {
      this.filters = {
        query: '',
        location: '',
        experience: '',
        jobType: '',
      };
    },

    setCurrentJob(job) {
      this.currentJob = job;
    },

    clearCurrentJob() {
      this.currentJob = null;
    },
  },

  persist: {
    storage: process.client ? localStorage : null,
    paths: ['savedJobs', 'filters'],
  },
});
