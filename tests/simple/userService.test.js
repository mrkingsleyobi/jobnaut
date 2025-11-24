// Simple User Service Test
// Test the user service without complex mocking

const userService = require('../../src/models/user');

describe('User Service', () => {
  it('should have createUser method', () => {
    expect(userService.createUser).toBeDefined();
    expect(typeof userService.createUser).toBe('function');
  });

  it('should have getUserById method', () => {
    expect(userService.getUserById).toBeDefined();
    expect(typeof userService.getUserById).toBe('function');
  });

  it('should have getUserByClerkId method', () => {
    expect(userService.getUserByClerkId).toBeDefined();
    expect(typeof userService.getUserByClerkId).toBe('function');
  });

  it('should have updateUser method', () => {
    expect(userService.updateUser).toBeDefined();
    expect(typeof userService.updateUser).toBe('function');
  });

  it('should have deleteUser method', () => {
    expect(userService.deleteUser).toBeDefined();
    expect(typeof userService.deleteUser).toBe('function');
  });
});
