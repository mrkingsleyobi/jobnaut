// User Profile Management Tests
// Test suite for user profile management routes

const request = require('supertest');
const express = require('express');

// Create test app function
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/user', require('../../src/routes/user'));
  return app;
};

// Helper function to setup mocks and recreate app for tests that need resetModules
const setupTestEnvironment = (authMiddlewareMock = null) => {
  // Reset modules to clear any cached modules
  jest.resetModules();

  // Re-apply the service mocks after resetModules
  jest.mock('../../src/services/userProfile', () => {
    return {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      addSkills: jest.fn(),
      removeSkills: jest.fn(),
    };
  });

  // Apply auth middleware mock if provided
  if (authMiddlewareMock) {
    jest.mock('../../src/auth/middleware', () => {
      return {
        authMiddleware: authMiddlewareMock,
      };
    });
  }

  // Re-require the service after resetModules
  const userProfileService = require('../../src/services/userProfile');

  // Create new app instance
  const app = createTestApp();

  return { userProfileService, app };
};

describe('User Profile Management Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'Test User',
        location: 'New York',
        experienceLevel: 'mid',
        skills: ['JavaScript', 'Node.js'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.getProfile.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer valid_token');

      // Assert
      expect(userProfileService.getProfile).toHaveBeenCalledWith(1);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        profile: mockUser,
      });
    });

    it('should return 401 for missing authorization header', async () => {
      // Setup test environment with auth middleware that returns 401
      const { app } = setupTestEnvironment((req, res) => {
        return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
      });

      // Act
      const response = await request(app).get('/api/v1/user/profile');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized: No valid token provided',
      });
    });

    it('should return 500 for internal server error', async () => {
      // Arrange
      const error = new Error('Database error');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.getProfile.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer valid_token');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to fetch profile',
      });
    });
  });

  describe('PUT /api/v1/user/profile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const profileData = {
        name: 'Updated Name',
        location: 'San Francisco',
        experienceLevel: 'senior',
        skills: ['JavaScript', 'Node.js', 'React'],
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'Updated Name',
        location: 'San Francisco',
        experienceLevel: 'senior',
        skills: ['JavaScript', 'Node.js', 'React'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.updateProfile.mockResolvedValue(mockUpdatedUser);

      // Act
      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(profileData);

      // Assert
      expect(userProfileService.updateProfile).toHaveBeenCalledWith(1, profileData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        profile: mockUpdatedUser,
      });
    });

    it('should return 400 for skills validation error', async () => {
      // Arrange
      const invalidData = {
        skills: 'not_an_array',
      };

      // Setup test environment with auth middleware
      const { app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Act
      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0]).toHaveProperty('msg');
      expect(response.body.errors[0]).toHaveProperty('path');
      expect(response.body.errors[0].path).toBe('skills');
    });

    it('should return 401 for missing authorization header', async () => {
      // Setup test environment with auth middleware that returns 401
      const { app } = setupTestEnvironment((req, res) => {
        return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
      });

      // Act
      const response = await request(app)
        .put('/api/v1/user/profile')
        .send({ name: 'Updated Name' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized: No valid token provided',
      });
    });

    it('should return 404 when user not found for update', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const error = new Error('User not found');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.updateProfile.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'User not found',
      });
    });

    it('should return 500 for internal server error during update', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const error = new Error('Database error');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.updateProfile.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updateData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to update profile',
      });
    });
  });

  describe('POST /api/v1/user/skills', () => {
    it('should add skills to user profile successfully', async () => {
      // Arrange
      const skillsData = {
        skills: ['JavaScript', 'Node.js', 'React'],
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'Test User',
        location: 'New York',
        experienceLevel: 'mid',
        skills: ['JavaScript', 'Node.js', 'React'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.addSkills.mockResolvedValue(mockUpdatedUser);

      // Act
      const response = await request(app)
        .post('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(skillsData);

      // Assert
      expect(userProfileService.addSkills).toHaveBeenCalledWith(1, skillsData.skills);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        profile: mockUpdatedUser,
      });
    });

    it('should return 400 for invalid skills array', async () => {
      // Arrange
      const invalidData = {
        skills: 'not_an_array',
      };

      // Setup test environment with auth middleware
      const { app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Act
      const response = await request(app)
        .post('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0]).toHaveProperty('msg');
      expect(response.body.errors[0]).toHaveProperty('path');
      expect(response.body.errors[0].path).toBe('skills');
    });

    it('should return 401 for missing authorization header', async () => {
      // Setup test environment with auth middleware that returns 401
      const { app } = setupTestEnvironment((req, res) => {
        return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
      });

      // Act
      const response = await request(app)
        .post('/api/v1/user/skills')
        .send({ skills: ['JavaScript'] });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized: No valid token provided',
      });
    });

    it('should return 404 when user not found for adding skills', async () => {
      // Arrange
      const skillsData = { skills: ['JavaScript'] };
      const error = new Error('User not found');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.addSkills.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(skillsData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'User not found',
      });
    });

    it('should return 500 for internal server error during skills addition', async () => {
      // Arrange
      const skillsData = { skills: ['JavaScript'] };
      const error = new Error('Database error');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.addSkills.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(skillsData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to add skills',
      });
    });
  });

  describe('DELETE /api/v1/user/skills', () => {
    it('should remove skills from user profile successfully', async () => {
      // Arrange
      const skillsData = {
        skills: ['JavaScript', 'Node.js'],
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'Test User',
        location: 'New York',
        experienceLevel: 'mid',
        skills: ['React'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.removeSkills.mockResolvedValue(mockUpdatedUser);

      // Act
      const response = await request(app)
        .delete('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(skillsData);

      // Assert
      expect(userProfileService.removeSkills).toHaveBeenCalledWith(1, skillsData.skills);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        profile: mockUpdatedUser,
      });
    });

    it('should return 400 for invalid skills array', async () => {
      // Arrange
      const invalidData = {
        skills: 'not_an_array',
      };

      // Setup test environment with auth middleware
      const { app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Act
      const response = await request(app)
        .delete('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0]).toHaveProperty('msg');
      expect(response.body.errors[0]).toHaveProperty('path');
      expect(response.body.errors[0].path).toBe('skills');
    });

    it('should return 401 for missing authorization header', async () => {
      // Setup test environment with auth middleware that returns 401
      const { app } = setupTestEnvironment((req, res) => {
        return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
      });

      // Act
      const response = await request(app)
        .delete('/api/v1/user/skills')
        .send({ skills: ['JavaScript'] });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized: No valid token provided',
      });
    });

    it('should return 404 when user not found for removing skills', async () => {
      // Arrange
      const skillsData = { skills: ['JavaScript'] };
      const error = new Error('User not found');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.removeSkills.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .delete('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(skillsData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'User not found',
      });
    });

    it('should return 500 for internal server error during skills removal', async () => {
      // Arrange
      const skillsData = { skills: ['JavaScript'] };
      const error = new Error('Database error');

      // Setup test environment with auth middleware
      const { userProfileService, app } = setupTestEnvironment((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      // Apply mock return values
      userProfileService.removeSkills.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .delete('/api/v1/user/skills')
        .set('Authorization', 'Bearer valid_token')
        .send(skillsData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to remove skills',
      });
    });
  });
});
