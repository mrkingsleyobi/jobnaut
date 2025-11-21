// Clerk Authentication Tests
// Test suite for Clerk authentication service

// Mock Prisma client first
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../src/db/client', () => mockPrisma);
jest.mock('../../src/db/testClient', () => mockPrisma);

// Mock User Service to test the actual clerk service implementation
jest.mock('../../src/models/user', () => {
  return {
    getUserByClerkId: jest.fn(),
    createUser: jest.fn(),
  };
});

// Mock encryption service
jest.mock('../../src/services/encryption', () => {
  return {
    encryptUserData: jest.fn((userData) => {
      // Return the user data as-is for testing purposes
      return {
        ...userData,
        name: userData.name || null,
        location: userData.location || null,
        experienceLevel: userData.experienceLevel || null,
        skills: userData.skills || null,
      };
    }),
    decrypt: jest.fn((encryptedData) => {
      // For testing, return the data as-is
      return encryptedData;
    }),
  };
});

// Mock Clerk SDK
const mockSessionAPI = {
  verifySessionToken: jest.fn(),
};

const mockUserAPI = {
  getUser: jest.fn(),
};

const mockClerkClient = {
  sessions: mockSessionAPI,
  users: mockUserAPI,
};

jest.mock('@clerk/clerk-sdk-node', () => {
  return {
    createClerkClient: jest.fn(() => mockClerkClient),
  };
});

const { createClerkClient } = require('@clerk/clerk-sdk-node');
const clerkAuthService = require('../../src/auth/clerk');
const userService = require('../../src/models/user');

describe('Clerk Authentication Service', () => {
  let mockClerkClient;
  let mockClerkUser;
  let mockLocalUser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Clerk user data
    mockClerkUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com', primary: true }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    };

    // Mock local user data
    mockLocalUser = {
      id: 1,
      clerkId: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      location: null,
      experienceLevel: null,
      skills: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset all mock functions
    mockSessionAPI.verifySessionToken.mockReset();
    mockUserAPI.getUser.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
  });

  describe('getClient', () => {
    it('should return the Clerk client instance', () => {
      // Act
      const client = clerkAuthService.getClient();

      // Assert
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });
  });

  describe('syncUserWithDatabase', () => {
    it('should return existing user if already in database', async () => {
      // Arrange
      userService.getUserByClerkId.mockImplementation(() => Promise.resolve(mockLocalUser));

      // Act
      const result = await clerkAuthService.syncUserWithDatabase(mockClerkUser);

      // Assert
      expect(userService.getUserByClerkId).toHaveBeenCalledWith('user_123');
      expect(userService.createUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockLocalUser);
    });

    it('should create new user if not in database', async () => {
      // Arrange
      userService.getUserByClerkId.mockImplementation(() => Promise.resolve(null));
      userService.createUser.mockImplementation(() => Promise.resolve(mockLocalUser));

      // Act
      const result = await clerkAuthService.syncUserWithDatabase(mockClerkUser);

      // Assert
      expect(userService.getUserByClerkId).toHaveBeenCalledWith('user_123');
      expect(userService.createUser).toHaveBeenCalledWith({
        clerkId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        location: undefined,
        experienceLevel: undefined,
        skills: undefined,
      });
      expect(result).toEqual(mockLocalUser);
    });

    it('should handle database errors when creating user', async () => {
      // Arrange
      userService.getUserByClerkId.mockImplementation(() => Promise.resolve(null));
      const error = new Error('Database error');
      userService.createUser.mockImplementation(() => Promise.reject(error));

      // Act & Assert
      await expect(clerkAuthService.syncUserWithDatabase(mockClerkUser)).rejects.toThrow(
        'Database error'
      );
      expect(userService.getUserByClerkId).toHaveBeenCalledWith('user_123');
      expect(userService.createUser).toHaveBeenCalledWith({
        clerkId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        location: undefined,
        experienceLevel: undefined,
        skills: undefined,
      });
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      // Arrange
      const sessionToken = 'valid_token';
      const mockSession = { userId: 'user_123', status: 'active' };
      mockSessionAPI.verifySessionToken.mockImplementation(() => Promise.resolve(mockSession));

      // Act
      const result = await clerkAuthService.validateSession(sessionToken);

      // Assert
      expect(mockSessionAPI.verifySessionToken).toHaveBeenCalledWith(sessionToken);
      expect(result).toEqual(mockSession);
    });

    it('should return null for invalid session', async () => {
      // Arrange
      const sessionToken = 'invalid_token';
      const error = new Error('Invalid token');
      mockSessionAPI.verifySessionToken.mockImplementation(() => Promise.reject(error));

      // Act
      const result = await clerkAuthService.validateSession(sessionToken);

      // Assert
      expect(mockSessionAPI.verifySessionToken).toHaveBeenCalledWith(sessionToken);
      expect(result).toBeNull();
    });
  });

  describe('getUserBySession', () => {
    it('should get user by valid session token', async () => {
      // Arrange
      const sessionToken = 'valid_token';
      const mockSession = { userId: 'user_123', status: 'active' };
      mockSessionAPI.verifySessionToken.mockImplementation(() => Promise.resolve(mockSession));
      mockUserAPI.getUser.mockImplementation(() => Promise.resolve(mockClerkUser));
      userService.getUserByClerkId.mockImplementation(() => Promise.resolve(mockLocalUser));

      // Act
      const result = await clerkAuthService.getUserBySession(sessionToken);

      // Assert
      expect(mockSessionAPI.verifySessionToken).toHaveBeenCalledWith(sessionToken);
      expect(mockUserAPI.getUser).toHaveBeenCalledWith('user_123');
      expect(userService.getUserByClerkId).toHaveBeenCalledWith('user_123');
      expect(result).toEqual({
        ...mockLocalUser,
        clerkUser: mockClerkUser,
      });
    });

    it('should return null for invalid session', async () => {
      // Arrange
      const sessionToken = 'invalid_token';
      mockSessionAPI.verifySessionToken.mockImplementation(() => Promise.resolve(null));

      // Act
      const result = await clerkAuthService.getUserBySession(sessionToken);

      // Assert
      expect(mockSessionAPI.verifySessionToken).toHaveBeenCalledWith(sessionToken);
      expect(result).toBeNull();
    });

    it('should handle Clerk API errors', async () => {
      // Arrange
      const sessionToken = 'valid_token';
      const mockSession = { userId: 'user_123', status: 'active' };
      mockSessionAPI.verifySessionToken.mockImplementation(() => Promise.resolve(mockSession));
      const error = new Error('Clerk API error');
      mockUserAPI.getUser.mockImplementation(() => Promise.reject(error));

      // Act
      const result = await clerkAuthService.getUserBySession(sessionToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const sessionToken = 'valid_token';
      const mockSession = { userId: 'user_123', status: 'active' };
      mockSessionAPI.verifySessionToken.mockImplementation(() => Promise.resolve(mockSession));
      mockUserAPI.getUser.mockImplementation(() => Promise.resolve(mockClerkUser));
      const error = new Error('Database error');
      userService.getUserByClerkId.mockImplementation(() => Promise.reject(error));

      // Act
      const result = await clerkAuthService.getUserBySession(sessionToken);

      // Assert
      expect(result).toBeNull();
    });
  });
});
