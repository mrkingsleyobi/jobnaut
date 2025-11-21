// Test for Skill Gap Analysis Service

const skillGapService = require('../../src/services/skillGapService');

describe('Skill Gap Analysis Service', () => {
  describe('calculateSkillGaps', () => {
    it('should calculate skill gaps correctly', () => {
      const userSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills = ['JavaScript', 'React', 'Vue.js', 'Python'];

      const result = skillGapService.calculateSkillGaps(userSkills, jobSkills);

      expect(result.matchingSkills).toEqual(['javascript', 'react']);
      expect(result.missingSkills).toEqual(['vue.js', 'python']);
      expect(result.excessSkills).toEqual(['node.js']);
      expect(result.matchPercentage).toBe(50);
      expect(result.gapScore).toBe(50);
    });

    it('should handle empty skill arrays', () => {
      const result = skillGapService.calculateSkillGaps([], []);

      expect(result.matchingSkills).toEqual([]);
      expect(result.missingSkills).toEqual([]);
      expect(result.excessSkills).toEqual([]);
      expect(result.matchPercentage).toBe(0);
      expect(result.gapScore).toBe(100);
    });

    it('should handle case insensitive skill comparison', () => {
      const userSkills = ['JavaScript', 'REACT'];
      const jobSkills = ['javascript', 'React'];

      const result = skillGapService.calculateSkillGaps(userSkills, jobSkills);

      expect(result.matchingSkills).toEqual(['javascript', 'react']);
      expect(result.missingSkills).toEqual([]);
      expect(result.excessSkills).toEqual([]);
      expect(result.matchPercentage).toBe(100);
      expect(result.gapScore).toBe(100);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for missing skills', () => {
      const gapAnalysis = {
        missingSkillsCount: 3,
        missingSkills: ['Vue.js', 'Python', 'Docker'],
        jobSkills: ['JavaScript', 'React', 'Vue.js', 'Python', 'Docker'],
        matchPercentage: 40,
      };

      const recommendations = skillGapService.generateRecommendations(gapAnalysis);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].type).toBe('skill_development');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[1].type).toBe('foundational_skills');
      expect(recommendations[1].priority).toBe('medium');
    });

    it('should generate advanced recommendations for high match scores', () => {
      const gapAnalysis = {
        missingSkillsCount: 1,
        missingSkills: ['Advanced Vue.js'],
        jobSkills: ['JavaScript', 'React', 'Vue.js', 'Advanced Vue.js'],
        matchPercentage: 85,
      };

      const recommendations = skillGapService.generateRecommendations(gapAnalysis);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].type).toBe('skill_development');
      expect(recommendations[1].type).toBe('advanced_skills');
    });
  });
});
