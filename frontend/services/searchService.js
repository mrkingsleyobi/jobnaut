// Search service for JobNaut frontend
// Handles Meilisearch API integration for real-time job search

import { MeiliSearch } from 'meilisearch';

class SearchService {
  constructor() {
    // Get configuration from runtime config
    // In test environment, use default values
    let host = 'http://localhost:7700';
    let apiKey = '';

    if (typeof useRuntimeConfig !== 'undefined') {
      const config = useRuntimeConfig();
      host = config.public.meilisearchHost || 'http://localhost:7700';
      apiKey = config.public.meilisearchKey || '';
    }

    // Initialize Meilisearch client
    this.client = new MeiliSearch({
      host: host,
      apiKey: apiKey,
    });

    // Job index
    this.jobIndex = this.client.index('jobs');
  }

  /**
   * Search jobs with filters
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {string} params.location - Location filter
   * @param {string} params.experience - Experience level filter
   * @param {string} params.jobType - Job type filter
   * @param {number} params.page - Page number
   * @param {number} params.limit - Results per page
   * @returns {Promise<Object>} Search results
   */
  async searchJobs(params = {}) {
    try {
      // Build search filters
      const filters = [];

      if (params.location) {
        if (params.location === 'remote') {
          filters.push('location = "Remote"');
        } else {
          filters.push(`location = "${params.location}"`);
        }
      }

      if (params.experience) {
        filters.push(`experienceLevel = "${params.experience}"`);
      }

      if (params.jobType) {
        filters.push(`jobType = "${params.jobType}"`);
      }

      // Perform search
      const searchResult = await this.jobIndex.search(params.query || '', {
        filter: filters.length > 0 ? filters.join(' AND ') : undefined,
        limit: params.limit || 20,
        offset: params.page ? (params.page - 1) * (params.limit || 20) : 0,
        sort: ['postedDate:desc'],
      });

      return {
        jobs: searchResult.hits,
        total: searchResult.estimatedTotalHits,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: Math.ceil(searchResult.estimatedTotalHits / (params.limit || 20)),
      };
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw new Error(`Failed to search jobs: ${error.message}`);
    }
  }

  /**
   * Get job by ID
   * @param {string} id - Job ID
   * @returns {Promise<Object>} Job data
   */
  async getJobById(id) {
    try {
      const job = await this.jobIndex.getDocument(id);
      return job;
    } catch (error) {
      console.error('Error getting job by ID:', error);
      throw new Error(`Failed to get job: ${error.message}`);
    }
  }

  /**
   * Get recommendations based on user skills
   * @param {Array} userSkills - User's skills
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Recommended jobs
   */
  async getRecommendations(userSkills = [], limit = 10) {
    try {
      // Build query from user skills
      const query = userSkills.join(' OR ');

      // Search for jobs matching user skills
      const searchResult = await this.jobIndex.search(query, {
        limit: limit,
        sort: ['matchScore:desc', 'postedDate:desc'],
      });

      return searchResult.hits;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Index jobs in Meilisearch
   * @param {Array} jobs - Jobs to index
   * @returns {Promise<Object>} Indexing result
   */
  async indexJobs(jobs) {
    try {
      const result = await this.jobIndex.addDocuments(jobs);
      return result;
    } catch (error) {
      console.error('Error indexing jobs:', error);
      throw new Error(`Failed to index jobs: ${error.message}`);
    }
  }

  /**
   * Update job in Meilisearch
   * @param {Object} job - Job data to update
   * @returns {Promise<Object>} Update result
   */
  async updateJob(job) {
    try {
      const result = await this.jobIndex.updateDocuments([job]);
      return result;
    } catch (error) {
      console.error('Error updating job:', error);
      throw new Error(`Failed to update job: ${error.message}`);
    }
  }

  /**
   * Delete job from Meilisearch
   * @param {string} jobId - Job ID to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteJob(jobId) {
    try {
      const result = await this.jobIndex.deleteDocument(jobId);
      return result;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new SearchService();
