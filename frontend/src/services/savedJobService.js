// Saved Job Service for JobNaut
// Handles operations related to user saved jobs

class SavedJobService {
  constructor() {
    // In a real implementation, this would connect to a database
    // For now, we'll use an in-memory store for demonstration
    this.savedJobs = [
      {
        id: '1',
        userId: 'user123',
        jobId: '1',
        notes: '',
        status: 'saved',
        savedAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user123',
        jobId: '3',
        notes: '',
        status: 'saved',
        savedAt: new Date().toISOString(),
      },
      {
        id: '3',
        userId: 'user123',
        jobId: '5',
        notes: '',
        status: 'saved',
        savedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Get all saved jobs for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of saved jobs
   */
  async getSavedJobs(userId) {
    try {
      // Filter saved jobs by user ID
      const userSavedJobs = this.savedJobs.filter((job) => job.userId === userId);
      return userSavedJobs;
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      throw new Error('Failed to retrieve saved jobs');
    }
  }

  /**
   * Save a job for a user
   * @param {Object} params - Save job parameters
   * @param {string} params.userId - The user ID
   * @param {string} params.jobId - The job ID
   * @param {string} [params.notes] - Optional notes
   * @param {string} [params.status] - Optional status
   * @returns {Promise<Object>} - The saved job record
   */
  async saveJob({ userId, jobId, notes = '', status = 'saved' }) {
    try {
      // Check if job is already saved
      const existingSavedJob = this.savedJobs.find(
        (job) => job.userId === userId && job.jobId === jobId
      );

      if (existingSavedJob) {
        throw new Error('Job is already saved');
      }

      // Create new saved job record
      const savedJob = {
        id: String(this.savedJobs.length + 1),
        userId,
        jobId,
        notes,
        status,
        savedAt: new Date().toISOString(),
      };

      // Add to saved jobs array
      this.savedJobs.push(savedJob);

      return savedJob;
    } catch (error) {
      console.error('Error saving job:', error);
      throw new Error(`Failed to save job: ${error.message}`);
    }
  }

  /**
   * Remove a saved job for a user
   * @param {string} userId - The user ID
   * @param {string} jobId - The job ID
   * @returns {Promise<void>}
   */
  async removeSavedJob(userId, jobId) {
    try {
      // Find index of saved job
      const index = this.savedJobs.findIndex((job) => job.userId === userId && job.jobId === jobId);

      if (index === -1) {
        throw new Error('Saved job not found');
      }

      // Remove from array
      this.savedJobs.splice(index, 1);

      return { success: true };
    } catch (error) {
      console.error('Error removing saved job:', error);
      throw new Error(`Failed to remove saved job: ${error.message}`);
    }
  }

  /**
   * Update a saved job's notes or status
   * @param {Object} params - Update parameters
   * @param {string} params.userId - The user ID
   * @param {string} params.jobId - The job ID
   * @param {string} [params.notes] - Optional notes
   * @param {string} [params.status] - Optional status
   * @returns {Promise<Object>} - The updated saved job record
   */
  async updateSavedJob({ userId, jobId, notes, status }) {
    try {
      // Find the saved job
      const savedJob = this.savedJobs.find((job) => job.userId === userId && job.jobId === jobId);

      if (!savedJob) {
        throw new Error('Saved job not found');
      }

      // Update fields if provided
      if (notes !== undefined) {
        savedJob.notes = notes;
      }

      if (status !== undefined) {
        savedJob.status = status;
      }

      // Add updated timestamp
      savedJob.updatedAt = new Date().toISOString();

      return savedJob;
    } catch (error) {
      console.error('Error updating saved job:', error);
      throw new Error(`Failed to update saved job: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new SavedJobService();
