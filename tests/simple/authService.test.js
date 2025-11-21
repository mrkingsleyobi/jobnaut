// Simple Auth Service Test
// Test the auth service without complex mocking

const clerkAuthService = require('../../src/auth/clerk');

describe('Auth Service', () => {
  it('should have getClient method', () => {
    expect(clerkAuthService.getClient).toBeDefined();
    expect(typeof clerkAuthService.getClient).toBe('function');
  });

  it('should have syncUserWithDatabase method', () => {
    expect(clerkAuthService.syncUserWithDatabase).toBeDefined();
    expect(typeof clerkAuthService.syncUserWithDatabase).toBe('function');
  });

  it('should have validateSession method', () => {
    expect(clerkAuthService.validateSession).toBeDefined();
    expect(typeof clerkAuthService.validateSession).toBe('function');
  });

  it('should have getUserBySession method', () => {
    expect(clerkAuthService.getUserBySession).toBeDefined();
    expect(typeof clerkAuthService.getUserBySession).toBe('function');
  });
});
