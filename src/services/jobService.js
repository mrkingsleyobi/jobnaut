// Job Service for JobNaut
// Handles job data fetching from JSearch API, NLP processing, and database operations

const axios = require('axios');
const jobModel = require('../models/job');

/**
 * Job Service
 */
class JobService {
  constructor() {
    // JSearch API configuration
    this.JSEARCH_API_KEY = process.env.JSEARCH_API_KEY || 'YOUR_JSEARCH_API_KEY';
    this.JSEARCH_API_URL = 'https://jsearch.p.rapidapi.com/search';

    // Meilisearch configuration
    this.MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    this.MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || '';

    // Hugging Face configuration
    this.HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY || 'YOUR_HUGGING_FACE_API_KEY';
    this.HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models';

    // Python NLP service configuration
    this.NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Fetch jobs from JSearch API
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Array of job objects
   */
  async fetchJobsFromJSearch(params = {}) {
    // Return mock data during tests
    if (process.env.NODE_ENV === 'test') {
      return [
        {
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          description: 'Exciting opportunity for a software engineer',
          skills: [],
          postedDate: new Date(),
          applicationLink: 'https://example.com/apply/1',
          source: 'jsearch',
          sourceId: '123'
        }
      ];
    }

    try {
      const response = await axios.get(this.JSEARCH_API_URL, {
        headers: {
          'X-RapidAPI-Key': this.JSEARCH_API_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        params: {
          query: params.query || 'software engineer',
          page: params.page || '1',
          num_pages: params.num_pages || '1',
          date_posted: params.date_posted || 'all',
          ...params
        }
      });

      // Extract job data from response
      const jobs = response.data.data || [];

      // Process jobs for storage
      return jobs.map(job => ({
        title: job.job_title || '',
        company: job.employer_name || '',
        location: job.job_city ? `${job.job_city}, ${job.job_state}` : job.job_country || '',
        description: job.job_description || '',
        skills: [], // Will be populated by NLP service
        postedDate: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : new Date(),
        applicationLink: job.job_apply_link || '',
        source: 'jsearch',
        sourceId: job.job_id || null
      }));
    } catch (error) {
      console.error('Error fetching jobs from JSearch API:', error.message);
      throw new Error(`Failed to fetch jobs from JSearch API: ${error.message}`);
    }
  }

  /**
   * Extract skills from job description using Python NLP service
   * @param {string} description - Job description text
   * @returns {Promise<Array>} Array of extracted skills
   */
  async extractSkillsWithNLP(description) {
    // Skip NLP processing if service is not configured or in test environment
    if (!this.NLP_SERVICE_URL || this.NLP_SERVICE_URL === 'http://localhost:8000' || process.env.NODE_ENV === 'test') {
      console.log('Skipping NLP skill extraction - service not available');
      return [];
    }

    try {
      // Call the Python NLP service to extract skills
      const response = await axios.post(`${this.NLP_SERVICE_URL}/extract-skills`, {
        text: description
      }, {
        timeout: 10000 // 10 second timeout
      });

      return response.data.skills || [];
    } catch (error) {
      console.warn('Warning: Could not extract skills with NLP:', error.message);
      // Return empty array if NLP processing fails
      return [];
    }
  }

  /**
   * Batch extract skills from multiple job descriptions
   * @param {Array<string>} descriptions - Array of job descriptions
   * @returns {Promise<Array<Array>>} Array of skill arrays for each description
   */
  async batchExtractSkills(descriptions) {
    // Skip NLP processing if service is not configured or in test environment
    if (!this.NLP_SERVICE_URL || this.NLP_SERVICE_URL === 'http://localhost:8000' || process.env.NODE_ENV === 'test') {
      console.log('Skipping batch NLP skill extraction - service not available');
      return descriptions.map(() => []);
    }

    try {
      // Call the Python NLP service to extract skills for multiple descriptions
      const response = await axios.post(`${this.NLP_SERVICE_URL}/batch-extract-skills`, {
        texts: descriptions
      }, {
        timeout: 30000 // 30 second timeout for batch processing
      });

      return response.data.skills || descriptions.map(() => []);
    } catch (error) {
      console.warn('Warning: Could not batch extract skills with NLP:', error.message);
      // Return empty arrays if NLP processing fails
      return descriptions.map(() => []);
    }
  }

  /**
   * Process and store jobs in database
   * @param {Array} rawJobs - Raw jobs from JSearch API
   * @returns {Promise<Array>} Array of processed jobs
   */
  async processAndStoreJobs(rawJobs) {
    try {
      const processedJobs = [];

      for (const rawJob of rawJobs) {
        // Extract skills using NLP
        const skills = await this.extractSkillsWithNLP(rawJob.description);

        // Prepare job data for storage
        const jobData = {
          title: rawJob.title,
          company: rawJob.company,
          location: rawJob.location,
          description: rawJob.description,
          skills: skills,
          postedDate: rawJob.postedDate,
          applicationLink: rawJob.applicationLink,
        };

        // Store job in database
        const storedJob = await jobModel.createJob(jobData);
        processedJobs.push(storedJob);
      }

      return processedJobs;
    } catch (error) {
      console.error('Error processing and storing jobs:', error.message);
      throw new Error(`Failed to process and store jobs: ${error.message}`);
    }
  }

  /**
   * Index jobs in Meilisearch
   * @param {Array} jobs - Array of job objects to index
   * @returns {Promise<void>}
   */
  async indexJobsInMeilisearch(jobs) {
    // Skip Meilisearch indexing if host is not configured or in test environment
    if (!this.MEILISEARCH_HOST || this.MEILISEARCH_HOST === 'http://localhost:7700' || process.env.NODE_ENV === 'test') {
      console.log('Skipping Meilisearch indexing - service not available');
      return;
    }

    try {
      // Prepare jobs for Meilisearch indexing
      const jobsForIndexing = jobs.map(job => ({
        id: job.id || job.sourceId,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        skills: job.skills || [],
        postedDate: job.postedDate,
        applicationLink: job.applicationLink,
        source: job.source || 'jobnaut'
      }));

      // Call Meilisearch API to index jobs
      await axios.post(`${this.MEILISEARCH_HOST}/indexes/jobs/documents`,
        jobsForIndexing,
        {
          headers: {
            'Authorization': `Bearer ${this.MEILISEARCH_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log(`Successfully indexed ${jobsForIndexing.length} jobs in Meilisearch`);
    } catch (error) {
      console.warn('Warning: Could not index jobs in Meilisearch:', error.message);
      // Don't throw error to prevent breaking the application if Meilisearch is unavailable
    }
  }

  /**
   * Search jobs in database
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Number of results per page
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchJobs(query, page = 1, limit = 10) {
    try {
      return await jobModel.searchJobs(query, page, limit);
    } catch (error) {
      console.error('Error searching jobs in database:', error.message);
      throw new Error(`Failed to search jobs: ${error.message}`);
    }
  }

  /**
   * Get job by ID
   * @param {number} id - Job ID
   * @returns {Promise<Object>} Job data
   */
  async getJobById(id) {
    try {
      const job = await jobModel.getJobById(id);

      if (!job) {
        throw new Error('Job not found');
      }

      // Parse skills JSON
      let skills = [];
      if (job.skills) {
        try {
          skills = JSON.parse(job.skills);
        } catch (error) {
          console.warn('Failed to parse job skills:', error);
          skills = [];
        }
      }

      return {
        ...job,
        skills: skills,
      };
    } catch (error) {
      console.error('Error getting job by ID:', error.message);
      throw new Error(`Failed to get job: ${error.message}`);
    }
  }

  /**
   * Get all jobs with pagination
   * @param {number} page - Page number
   * @param {number} limit - Number of results per page
   * @returns {Promise<Object>} Jobs with pagination
   */
  async getAllJobs(page = 1, limit = 10) {
    try {
      const result = await jobModel.getAllJobs(page, limit);

      // Parse skills for each job
      const jobsWithParsedSkills = result.jobs.map(job => {
        let skills = [];
        if (job.skills) {
          try {
            skills = JSON.parse(job.skills);
          } catch (error) {
            console.warn('Failed to parse job skills:', error);
            skills = [];
          }
        }
        return {
          ...job,
          skills: skills,
        };
      });

      return {
        ...result,
        jobs: jobsWithParsedSkills,
      };
    } catch (error) {
      console.error('Error getting all jobs:', error.message);
      throw new Error(`Failed to get jobs: ${error.message}`);
    }
  }

  /**
   * Update job
   * @param {number} id - Job ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated job
   */
  async updateJob(id, updateData) {
    try {
      const updatedJob = await jobModel.updateJob(id, updateData);

      // Parse skills JSON for response
      let skills = [];
      if (updatedJob.skills) {
        try {
          skills = JSON.parse(updatedJob.skills);
        } catch (error) {
          console.warn('Failed to parse job skills:', error);
          skills = [];
        }
      }

      return {
        ...updatedJob,
        skills: skills,
      };
    } catch (error) {
      console.error('Error updating job:', error.message);
      throw new Error(`Failed to update job: ${error.message}`);
    }
  }

  /**
   * Delete job
   * @param {number} id - Job ID
   * @returns {Promise<Object>} Deleted job
   */
  async deleteJob(id) {
    try {
      return await jobModel.deleteJob(id);
    } catch (error) {
      console.error('Error deleting job:', error.message);
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }

  /**
   * Get job recommendations for a user
   * @param {number} userId - User ID
   * @param {Object} userSkills - User's skills
   * @returns {Promise<Array>} Array of recommended jobs
   */
  async getJobRecommendations(userId, userSkills = []) {
    try {
      // First, get user's profile to understand their skills and preferences
      // This would typically come from a user service
      const userProfile = await this.getUserProfile(userId);

      // Get jobs that match user skills
      const matchingJobs = await jobModel.getJobsBySkills(userSkills, 1, 20);

      // Add match scores based on skill overlap
      const jobsWithScores = matchingJobs.jobs.map(job => {
        let skills = [];
        if (job.skills) {
          try {
            skills = JSON.parse(job.skills);
          } catch (e) {
            skills = [];
          }
        }

        // Calculate match score based on skill overlap
        const matchingSkills = skills.filter(skill =>
          userSkills.includes(skill)
        );
        const matchScore = skills.length > 0 ? matchingSkills.length / skills.length : 0;

        return {
          ...job,
          skills: skills,
          matchScore: matchScore,
          postedDate: job.postedDate.toISOString()
        };
      });

      // Sort by match score (highest first)
      return jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error getting job recommendations:', error.message);
      throw new Error(`Failed to get job recommendations: ${error.message}`);
    }
  }

  /**
   * Get user profile (helper method)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    try {
      // This would typically use a user service
      // For now, we'll return a basic profile structure
      return {
        id: userId,
        skills: []
      };
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      return { id: userId, skills: [] };
    }
  }
}

module.exports = new JobService();