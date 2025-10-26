// Test for Skill Gap Analysis Router

const skillGapRouter = require('../../../src/api/routers/skillGap');

describe('Skill Gap Analysis Router', () => {
  describe('Input Validation', () => {
    it('should validate getAnalysisForJob input', async () => {
      const input = {
        userId: 'user123',
        jobId: 1
      };

      expect(() => {
        skillGapRouter.getAnalysisForJob._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it('should reject invalid getAnalysisForJob input', async () => {
      const invalidInputs = [
        { userId: '', jobId: 1 }, // Empty user ID
        { userId: 'user123', jobId: 0 }, // Invalid job ID
        { userId: 'user123' }, // Missing job ID
        { jobId: 1 } // Missing user ID
      ];

      invalidInputs.forEach(input => {
        expect(() => {
          skillGapRouter.getAnalysisForJob._def.inputs[0].parse(input);
        }).toThrow();
      });
    });

    it('should validate getAnalysisForJobs input', async () => {
      const input = {
        userId: 'user123',
        jobIds: [1, 2, 3]
      };

      expect(() => {
        skillGapRouter.getAnalysisForJobs._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it('should reject invalid getAnalysisForJobs input', async () => {
      const invalidInputs = [
        { userId: '', jobIds: [1, 2, 3] }, // Empty user ID
        { userId: 'user123', jobIds: [] }, // Empty job IDs array
        { userId: 'user123', jobIds: [0] }, // Invalid job ID
        { jobIds: [1, 2, 3] } // Missing user ID
      ];

      invalidInputs.forEach(input => {
        expect(() => {
          skillGapRouter.getAnalysisForJobs._def.inputs[0].parse(input);
        }).toThrow();
      });
    });

    it('should validate getOverallAnalysis input', async () => {
      const input = {
        userId: 'user123'
      };

      expect(() => {
        skillGapRouter.getOverallAnalysis._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it('should reject invalid getOverallAnalysis input', async () => {
      const invalidInputs = [
        { userId: '' }, // Empty user ID
        {} // Missing user ID
      ];

      invalidInputs.forEach(input => {
        expect(() => {
          skillGapRouter.getOverallAnalysis._def.inputs[0].parse(input);
        }).toThrow();
      });
    });
  });
});