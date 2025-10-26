// Skill Gap Analysis Service for JobNaut
// Analyzes gaps between user skills and job requirements

const jobModel = require('../models/job');
const userProfileService = require('./userProfile');

/**
 * Skill Gap Analysis Service
 */
class SkillGapService {
  /**
   * Calculate skill gaps between user skills and job requirements
   * @param {Array} userSkills - Array of user's current skills
   * @param {Array} jobSkills - Array of skills required for a job
   * @returns {Object} Skill gap analysis results
   */
  calculateSkillGaps(userSkills = [], jobSkills = []) {
    // Normalize skills to lowercase for comparison
    const normalizedUserSkills = userSkills.map(skill => skill.toLowerCase().trim());
    const normalizedJobSkills = jobSkills.map(skill => skill.toLowerCase().trim());

    // Find missing skills (skills required for job but user doesn't have)
    const missingSkills = normalizedJobSkills.filter(skill =>
      !normalizedUserSkills.includes(skill)
    );

    // Find matching skills (skills user has that are also required for job)
    const matchingSkills = normalizedJobSkills.filter(skill =>
      normalizedUserSkills.includes(skill)
    );

    // Find excess skills (skills user has but job doesn't require)
    const excessSkills = normalizedUserSkills.filter(skill =>
      !normalizedJobSkills.includes(skill)
    );

    // Calculate match percentage
    const matchPercentage = jobSkills.length > 0
      ? Math.round((matchingSkills.length / jobSkills.length) * 100)
      : 0;

    // Calculate gap score (0-100, where 100 means no gaps)
    const gapScore = jobSkills.length > 0
      ? Math.round((matchingSkills.length / jobSkills.length) * 100)
      : 100;

    return {
      matchingSkills: matchingSkills,
      missingSkills: missingSkills,
      excessSkills: excessSkills,
      matchPercentage: matchPercentage,
      gapScore: gapScore,
      totalRequiredSkills: jobSkills.length,
      userSkillsCount: userSkills.length,
      matchingSkillsCount: matchingSkills.length,
      missingSkillsCount: missingSkills.length,
      excessSkillsCount: excessSkills.length
    };
  }

  /**
   * Get skill gap analysis for a specific job
   * @param {number} userId - User ID
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Detailed skill gap analysis
   */
  async getSkillGapAnalysisForJob(userId, jobId) {
    try {
      // Get user profile and skills
      const userProfile = await userProfileService.getUserProfile(userId);
      const userSkills = userProfile.skills || [];

      // Get job details
      const job = await jobModel.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Parse job skills
      let jobSkills = [];
      if (job.skills) {
        try {
          jobSkills = Array.isArray(job.skills) ? job.skills : JSON.parse(job.skills);
        } catch (error) {
          console.warn('Failed to parse job skills:', error);
          jobSkills = [];
        }
      }

      // Calculate skill gaps
      const gapAnalysis = this.calculateSkillGaps(userSkills, jobSkills);

      return {
        success: true,
        data: {
          jobId: job.id,
          jobTitle: job.title,
          jobCompany: job.company,
          jobSkills: jobSkills,
          userSkills: userSkills,
          ...gapAnalysis,
          recommendations: this.generateRecommendations(gapAnalysis)
        }
      };
    } catch (error) {
      console.error('Error getting skill gap analysis for job:', error.message);
      throw new Error(`Failed to get skill gap analysis: ${error.message}`);
    }
  }

  /**
   * Get skill gap analysis for multiple jobs
   * @param {number} userId - User ID
   * @param {Array} jobIds - Array of Job IDs
   * @returns {Promise<Array>} Array of skill gap analyses
   */
  async getSkillGapAnalysisForJobs(userId, jobIds) {
    try {
      const analyses = [];

      for (const jobId of jobIds) {
        try {
          const analysis = await this.getSkillGapAnalysisForJob(userId, jobId);
          analyses.push(analysis.data);
        } catch (error) {
          console.warn(`Failed to analyze job ${jobId}:`, error.message);
          // Continue with other jobs
        }
      }

      // Sort by gap score (highest first)
      analyses.sort((a, b) => b.gapScore - a.gapScore);

      return {
        success: true,
        data: analyses
      };
    } catch (error) {
      console.error('Error getting skill gap analyses for jobs:', error.message);
      throw new Error(`Failed to get skill gap analyses: ${error.message}`);
    }
  }

  /**
   * Generate learning recommendations based on skill gaps
   * @param {Object} gapAnalysis - Skill gap analysis results
   * @returns {Array} Array of learning recommendations
   */
  generateRecommendations(gapAnalysis) {
    const recommendations = [];

    // If there are missing skills, recommend learning them
    if (gapAnalysis.missingSkillsCount > 0) {
      recommendations.push({
        type: 'skill_development',
        priority: 'high',
        title: `Learn ${gapAnalysis.missingSkillsCount} missing skills`,
        description: `Focus on learning the skills required for jobs in your target field`,
        skills: gapAnalysis.missingSkills,
        estimatedTime: `${gapAnalysis.missingSkillsCount * 20}-${
          gapAnalysis.missingSkillsCount * 40
        } hours`
      });
    }

    // If match percentage is low, recommend foundational skills
    if (gapAnalysis.matchPercentage < 50) {
      recommendations.push({
        type: 'foundational_skills',
        priority: 'medium',
        title: 'Strengthen foundational skills',
        description: 'Build a stronger foundation in core skills for your target career',
        skills: gapAnalysis.jobSkills.slice(0, 3),
        estimatedTime: '40-80 hours'
      });
    }

    // If match percentage is high, recommend advanced skills
    if (gapAnalysis.matchPercentage >= 80) {
      recommendations.push({
        type: 'advanced_skills',
        priority: 'low',
        title: 'Develop advanced expertise',
        description: 'Enhance your skills with advanced topics to stand out',
        skills: gapAnalysis.missingSkills.slice(0, 2),
        estimatedTime: '20-60 hours'
      });
    }

    return recommendations;
  }

  /**
   * Get overall skill gap analysis for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Overall skill gap analysis
   */
  async getOverallSkillGapAnalysis(userId) {
    try {
      // Get user profile and skills
      const userProfile = await userProfileService.getUserProfile(userId);
      const userSkills = userProfile.skills || [];

      // Get jobs that match user's interests (last 10 jobs)
      const jobsResult = await jobModel.getAllJobs(1, 10);
      const jobs = jobsResult.jobs || [];

      // Calculate average gap score across jobs
      let totalGapScore = 0;
      let jobCount = 0;
      const jobAnalyses = [];

      for (const job of jobs) {
        try {
          let jobSkills = [];
          if (job.skills) {
            try {
              jobSkills = Array.isArray(job.skills) ? job.skills : JSON.parse(job.skills);
            } catch (error) {
              console.warn('Failed to parse job skills:', error);
              jobSkills = [];
            }
          }

          const gapAnalysis = this.calculateSkillGaps(userSkills, jobSkills);
          totalGapScore += gapAnalysis.gapScore;
          jobCount++;

          jobAnalyses.push({
            jobId: job.id,
            jobTitle: job.title,
            jobCompany: job.company,
            gapScore: gapAnalysis.gapScore,
            missingSkillsCount: gapAnalysis.missingSkillsCount,
            matchingSkillsCount: gapAnalysis.matchingSkillsCount
          });
        } catch (error) {
          console.warn(`Failed to analyze job ${job.id}:`, error.message);
        }
      }

      const averageGapScore = jobCount > 0 ? Math.round(totalGapScore / jobCount) : 0;

      // Identify most common missing skills
      const skillFrequency = {};
      jobAnalyses.forEach(analysis => {
        // This would require more detailed analysis of individual job gaps
      });

      return {
        success: true,
        data: {
          userId: userId,
          userSkills: userSkills,
          averageGapScore: averageGapScore,
          jobCount: jobCount,
          jobAnalyses: jobAnalyses,
          overallAssessment: this.getOverallAssessment(averageGapScore),
          recommendations: this.getOverallRecommendations(averageGapScore, userSkills)
        }
      };
    } catch (error) {
      console.error('Error getting overall skill gap analysis:', error.message);
      throw new Error(`Failed to get overall skill gap analysis: ${error.message}`);
    }
  }

  /**
   * Get overall assessment based on average gap score
   * @param {number} averageGapScore - Average gap score
   * @returns {string} Assessment description
   */
  getOverallAssessment(averageGapScore) {
    if (averageGapScore >= 80) {
      return 'Excellent! You have most of the skills needed for jobs in your field.';
    } else if (averageGapScore >= 60) {
      return 'Good! You have many of the required skills, but there\'s room for improvement.';
    } else if (averageGapScore >= 40) {
      return 'Fair! You have some relevant skills, but significant gaps remain.';
    } else {
      return 'Needs improvement! Focus on building core skills for your target career.';
    }
  }

  /**
   * Get overall recommendations based on average gap score
   * @param {number} averageGapScore - Average gap score
   * @param {Array} userSkills - User's current skills
   * @returns {Array} Array of recommendations
   */
  getOverallRecommendations(averageGapScore, userSkills) {
    const recommendations = [];

    if (averageGapScore < 60) {
      recommendations.push({
        type: 'foundational_skills',
        priority: 'high',
        title: 'Focus on foundational skills',
        description: 'Build a strong foundation in core skills for your target career',
        estimatedTime: '80-160 hours'
      });
    } else if (averageGapScore < 80) {
      recommendations.push({
        type: 'skill_development',
        priority: 'medium',
        title: 'Target specific skill gaps',
        description: 'Focus on the most common missing skills across job opportunities',
        estimatedTime: '40-120 hours'
      });
    } else {
      recommendations.push({
        type: 'advanced_skills',
        priority: 'low',
        title: 'Develop expertise',
        description: 'Enhance your skills with advanced topics to stand out in the job market',
        estimatedTime: '40-100 hours'
      });
    }

    return recommendations;
  }
}

module.exports = new SkillGapService();