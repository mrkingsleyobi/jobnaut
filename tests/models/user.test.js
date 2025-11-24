// User Model Tests
// Test suite for User model operations

// Mock Prisma Client FIRST before any imports
jest.mock('../../src/db/testClient', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return mockPrisma;
});

// Mock encryption service to return predictable values
jest.mock('../../src/services/encryption', () => {
  return {
    encryptUserData: jest.fn((userData) => {
      // Return the user data as-is for testing purposes
      const encryptedData = { ...userData };

      // For fields that would be encrypted, return the plain value
      // But in test mode, we need to return strings to match Prisma schema
      if (userData.name) {
        encryptedData.name = userData.name;
      }
      if (userData.location) {
        encryptedData.location = userData.location;
      }
      if (userData.experienceLevel) {
        encryptedData.experienceLevel = userData.experienceLevel;
      }
      // For skills, return the array as-is (not JSON stringified) since the user model will handle JSON.stringify
      if (userData.skills) {
        encryptedData.skills = userData.skills;
      }

      return encryptedData;
    }),
    decrypt: jest.fn((encryptedData) => {
      // For testing, return the data as-is
      // In real implementation, this would decrypt encrypted data objects
      // But for testing, we just return the skills as-is since our mock
      // already has them in the correct format
      // If it's an array, return it as-is, don't convert to object
      if (Array.isArray(encryptedData)) {
        return encryptedData;
      }
      return encryptedData;
    }),
  };
});

const prisma = require('../../src/db/testClient');
const userService = require('../../src/models/user');

describe('User Model', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      id: 1,
      clerkId: 'clerk_test_123',
      email: 'test@example.com',
      name: 'Test User',
      location: 'New York',
      experienceLevel: 'mid',
      skills: ['JavaScript', 'Node.js'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const userData = {
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'Test User',
        location: 'New York',
        experienceLevel: 'mid',
        skills: ['JavaScript', 'Node.js'],
      };

      prisma.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          clerkId: userData.clerkId,
          email: userData.email,
          name: userData.name,
          location: userData.location,
          experienceLevel: userData.experienceLevel,
          skills: '["JavaScript","Node.js"]',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors when creating user', async () => {
      // Arrange
      const userData = {
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
      };

      const error = new Error('Database error');
      prisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow('Database error');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          clerkId: userData.clerkId,
          email: userData.email,
          name: undefined,
          location: undefined,
          experienceLevel: undefined,
          skills: null,
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user when found by id', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(1);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by id', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(999);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(result).toBeNull();
    });

    it('should handle database errors when getting user by id', async () => {
      // Arrange
      const error = new Error('Database connection error');
      prisma.user.findUnique.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.getUserById(999)).rejects.toThrow('Database connection error');
    });
  });

  describe('getUserByClerkId', () => {
    it('should return user when found by clerk id', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByClerkId('clerk_test_123');

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_test_123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by clerk id', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByClerkId('nonexistent_clerk_id');

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'nonexistent_clerk_id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Name',
        location: 'San Francisco',
        experienceLevel: 'senior',
      };

      const updatedUser = { ...mockUser, ...updateData };
      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(1, updateData);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle user not found when updating', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const error = new Error('User not found');
      error.code = 'P2025';
      prisma.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.updateUser(999, updateData)).rejects.toThrow('User not found');
    });

    it('should handle database errors when updating user', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const error = new Error('Database error');
      prisma.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.updateUser(1, updateData)).rejects.toThrow('Database error');
    });

    it('should convert skills array to JSON string when updating', async () => {
      // Arrange
      const updateData = {
        skills: ['JavaScript', 'React', 'Node.js'],
      };

      const updatedUser = { ...mockUser, skills: ['JavaScript', 'React', 'Node.js'] };
      prisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(1, updateData);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          skills: '["JavaScript","React","Node.js"]',
        },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      prisma.user.delete.mockResolvedValue(mockUser);

      // Act
      const result = await userService.deleteUser(1);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found when deleting', async () => {
      // Arrange
      const error = new Error('User not found');
      error.code = 'P2025';
      prisma.user.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.deleteUser(999)).rejects.toThrow('User not found');
    });
  });
});
