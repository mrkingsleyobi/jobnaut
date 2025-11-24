// Simple User Profile Service Test
// Test the user profile service without complex mocking

const userProfileService = require('../../src/services/userProfile');

describe('User Profile Service', () => {
  it('should have getProfile method', () => {
    expect(userProfileService.getProfile).toBeDefined();
    expect(typeof userProfileService.getProfile).toBe('function');
  });

  it('should have updateProfile method', () => {
    expect(userProfileService.updateProfile).toBeDefined();
    expect(typeof userProfileService.updateProfile).toBe('function');
  });

  it('should have addSkills method', () => {
    expect(userProfileService.addSkills).toBeDefined();
    expect(typeof userProfileService.addSkills).toBe('function');
  });

  it('should have removeSkills method', () => {
    expect(userProfileService.removeSkills).toBeDefined();
    expect(typeof userProfileService.removeSkills).toBe('function');
  });
});
