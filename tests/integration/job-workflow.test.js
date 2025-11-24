// Integration Test Suite for Complete Job Workflow

// Load environment variables
require('dotenv').config({ path: '.env.test' });

// Mock the database client
const mockPrisma = {
  job: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  savedJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../src/db/testClient', () => mockPrisma);
jest.mock('../../src/db/client', () => mockPrisma);

// Mock encryption service
jest.mock('../../src/services/encryption', () => ({
  encrypt: jest.fn((text) => ({
    data: `encrypted_${text}`,
    iv: 'mock_iv',
    tag: 'mock_tag',
  })),
  decrypt: jest.fn((encrypted) => (encrypted && encrypted.data ? encrypted.data.replace('encrypted_', '') : encrypted)),
  encryptUserData: jest.fn((data) => {
    const encrypted = {};
    Object.keys(data).forEach((key) => {
      if (data[key]) {
        encrypted[key] = {
          data: `encrypted_${data[key]}`,
          iv: 'mock_iv',
          tag: 'mock_tag',
        };
      }
    });
    return encrypted;
  }),
  decryptUserData: jest.fn((data) => {
    const decrypted = {};
    Object.keys(data).forEach((key) => {
      if (data[key] && typeof data[key] === 'object' && data[key].data) {
        decrypted[key] = data[key].data.replace('encrypted_', '');
      } else {
        decrypted[key] = data[key];
      }
    });
    return decrypted;
  }),
  getKey: jest.fn(() => Buffer.alloc(32)),
}));

// Mock NodeCache
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
};

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => mockCache);
});

describe('Job Workflow Integration Tests', () => {
  let jobService;
  let userService;
  let savedJobService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);

    // Reset modules to get fresh instances
    jest.resetModules();
    jobService = require('../../src/models/job');
    userService = require('../../src/models/user');
    savedJobService = require('../../src/models/savedJob');
  });

  describe('Complete Job Search Workflow', () => {
    it('should complete full job search and save workflow', async () => {
      // Step 1: Create a user
      const userData = {
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'John Doe',
        skills: ['JavaScript', 'React'],
      };

      const mockUser = {
        id: 1,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);
      const user = await userService.createUser(userData);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);

      // Step 2: Search for jobs
      const searchQuery = 'JavaScript Developer';
      const mockJobs = [
        {
          id: 100,
          title: 'JavaScript Developer',
          company: 'Tech Corp',
          location: 'San Francisco',
          description: 'Exciting opportunity',
          skills: JSON.stringify(['JavaScript', 'React']),
          postedDate: new Date(),
        },
        {
          id: 101,
          title: 'Senior JavaScript Engineer',
          company: 'StartUp Inc',
          location: 'New York',
          description: 'Great role',
          skills: JSON.stringify(['JavaScript', 'Node.js']),
          postedDate: new Date(),
        },
      ];

      mockPrisma.job.findMany.mockResolvedValue(mockJobs);
      mockPrisma.job.count.mockResolvedValue(2);

      const searchResults = await jobService.searchJobs(searchQuery);
      expect(searchResults.jobs).toHaveLength(2);
      expect(searchResults.total).toBe(2);

      // Step 3: Save a job
      const savedJobData = {
        userId: user.id,
        jobId: mockJobs[0].id,
        notes: 'Very interested in this position',
        applicationStatus: 'considering',
      };

      const mockSavedJob = {
        id: 1,
        ...savedJobData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.savedJob.create.mockResolvedValue(mockSavedJob);
      const savedJob = await savedJobService.saveJob(savedJobData);

      expect(savedJob).toBeDefined();
      expect(savedJob.userId).toBe(user.id);
      expect(savedJob.jobId).toBe(mockJobs[0].id);

      // Step 4: Verify saved jobs
      mockPrisma.savedJob.findMany.mockResolvedValue([
        {
          ...mockSavedJob,
          job: mockJobs[0],
        },
      ]);

      const userSavedJobs = await savedJobService.getSavedJobsByUser(user.id);
      expect(userSavedJobs).toHaveLength(1);
      expect(userSavedJobs[0].job.title).toBe('JavaScript Developer');
    });

    it('should handle job search with no results', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);
      mockPrisma.job.count.mockResolvedValue(0);

      const results = await jobService.searchJobs('NonexistentTechnology');

      expect(results.jobs).toHaveLength(0);
      expect(results.total).toBe(0);
    });
  });

  describe('Save and Unsave Job Workflow', () => {
    it('should save and then unsave a job', async () => {
      const userId = 1;
      const jobId = 100;

      // Save the job
      const mockSavedJob = {
        id: 1,
        userId,
        jobId,
        notes: 'Interested',
        applicationStatus: 'considering',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.savedJob.create.mockResolvedValue(mockSavedJob);
      const saved = await savedJobService.saveJob({ userId, jobId, notes: 'Interested' });
      expect(saved).toBeDefined();

      // Verify it's saved
      mockPrisma.savedJob.findUnique.mockResolvedValue({
        ...mockSavedJob,
        job: { id: jobId, title: 'Test Job' },
      });

      const retrieved = await savedJobService.getSavedJob(userId, jobId);
      expect(retrieved).toBeDefined();
      expect(retrieved.userId).toBe(userId);

      // Unsave the job
      mockPrisma.savedJob.delete.mockResolvedValue(mockSavedJob);
      const deleted = await savedJobService.deleteSavedJob(userId, jobId);
      expect(deleted).toBeDefined();

      // Verify it's no longer saved
      mockPrisma.savedJob.findUnique.mockResolvedValue(null);
      const afterDelete = await savedJobService.getSavedJob(userId, jobId);
      expect(afterDelete).toBeNull();
    });

    it('should update application status throughout workflow', async () => {
      const userId = 1;
      const jobId = 100;

      // Initial save
      mockPrisma.savedJob.create.mockResolvedValue({
        id: 1,
        userId,
        jobId,
        applicationStatus: 'considering',
      });

      await savedJobService.saveJob({ userId, jobId, applicationStatus: 'considering' });

      // Update to applied
      mockPrisma.savedJob.update.mockResolvedValue({
        id: 1,
        userId,
        jobId,
        applicationStatus: 'applied',
      });

      const applied = await savedJobService.updateSavedJob(userId, jobId, {
        applicationStatus: 'applied',
      });
      expect(applied.applicationStatus).toBe('applied');

      // Update to interviewed
      mockPrisma.savedJob.update.mockResolvedValue({
        id: 1,
        userId,
        jobId,
        applicationStatus: 'interviewed',
      });

      const interviewed = await savedJobService.updateSavedJob(userId, jobId, {
        applicationStatus: 'interviewed',
      });
      expect(interviewed.applicationStatus).toBe('interviewed');
    });
  });

  describe('Skill Gap Analysis Workflow', () => {
    it('should analyze skill gaps for a job', async () => {
      // Create user with specific skills
      const userData = {
        clerkId: 'clerk_test_123',
        email: 'test@example.com',
        name: 'John Doe',
        skills: ['JavaScript', 'React'],
      };

      mockPrisma.user.create.mockResolvedValue({ id: 1, ...userData });
      const user = await userService.createUser(userData);

      // Get job with required skills
      const mockJob = {
        id: 100,
        title: 'Full Stack Developer',
        company: 'Tech Corp',
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'PostgreSQL']),
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      const job = await jobService.getJobById(100);

      // Analyze skill gap
      const userSkills = userData.skills;
      const jobSkills = JSON.parse(job.skills);
      const missingSkills = jobSkills.filter((skill) => !userSkills.includes(skill));

      expect(missingSkills).toEqual(['Node.js', 'PostgreSQL']);
      expect(missingSkills).toHaveLength(2);
    });

    it('should show no skill gaps when user has all required skills', async () => {
      const userData = {
        clerkId: 'clerk_test_456',
        email: 'expert@example.com',
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
      };

      mockPrisma.user.create.mockResolvedValue({ id: 2, ...userData });
      const user = await userService.createUser(userData);

      const mockJob = {
        id: 101,
        title: 'Full Stack Developer',
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      const job = await jobService.getJobById(101);

      const userSkills = userData.skills;
      const jobSkills = JSON.parse(job.skills);
      const missingSkills = jobSkills.filter((skill) => !userSkills.includes(skill));

      expect(missingSkills).toHaveLength(0);
    });
  });

  describe('User Profile and Job Interaction', () => {
    it('should update user skills and affect job recommendations', async () => {
      // Create user with initial skills
      const initialData = {
        clerkId: 'clerk_test_789',
        email: 'learner@example.com',
        name: 'Jane Doe',
        skills: ['JavaScript'],
      };

      mockPrisma.user.create.mockResolvedValue({ id: 3, ...initialData });
      const user = await userService.createUser(initialData);

      // Update user with new skills
      const updatedData = {
        skills: ['JavaScript', 'React', 'TypeScript'],
      };

      mockPrisma.user.update.mockResolvedValue({
        ...user,
        ...updatedData,
      });

      const updatedUser = await userService.updateUser(user.id, updatedData);
      expect(updatedUser.skills).toContain('TypeScript');

      // Search for jobs matching new skills
      const mockJobs = [
        {
          id: 200,
          title: 'React Developer',
          skills: JSON.stringify(['React', 'TypeScript']),
        },
      ];

      mockPrisma.job.findMany.mockResolvedValue(mockJobs);
      mockPrisma.job.count.mockResolvedValue(1);

      const results = await jobService.searchJobs('React');
      expect(results.jobs).toHaveLength(1);
    });
  });

  describe('Pagination in Job Workflow', () => {
    it('should handle paginated job search', async () => {
      const mockJobsPage1 = [
        { id: 1, title: 'Job 1', postedDate: new Date() },
        { id: 2, title: 'Job 2', postedDate: new Date() },
      ];

      const mockJobsPage2 = [
        { id: 3, title: 'Job 3', postedDate: new Date() },
        { id: 4, title: 'Job 4', postedDate: new Date() },
      ];

      // First page
      mockPrisma.job.findMany.mockResolvedValue(mockJobsPage1);
      mockPrisma.job.count.mockResolvedValue(4);

      const page1 = await jobService.searchJobs('developer', 1, 2);
      expect(page1.jobs).toHaveLength(2);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(2);

      // Second page
      mockPrisma.job.findMany.mockResolvedValue(mockJobsPage2);

      const page2 = await jobService.searchJobs('developer', 2, 2);
      expect(page2.jobs).toHaveLength(2);
      expect(page2.page).toBe(2);
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should handle errors when saving already saved job', async () => {
      const savedJobData = {
        userId: 1,
        jobId: 100,
      };

      mockPrisma.savedJob.create.mockRejectedValue(
        new Error('Unique constraint failed on userId_jobId')
      );

      await expect(savedJobService.saveJob(savedJobData)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.job.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(jobService.searchJobs('developer')).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent saved job operations', async () => {
      const userId = 1;
      const jobIds = [100, 101, 102];

      // Simulate concurrent saves
      const savePromises = jobIds.map((jobId) => {
        mockPrisma.savedJob.create.mockResolvedValue({
          id: jobId,
          userId,
          jobId,
        });
        return savedJobService.saveJob({ userId, jobId });
      });

      const results = await Promise.all(savePromises);
      expect(results).toHaveLength(3);
    });
  });

  describe('Cache Invalidation in Workflow', () => {
    it('should invalidate cache when saving jobs', async () => {
      const userId = 1;
      const jobId = 100;

      mockPrisma.savedJob.create.mockResolvedValue({ id: 1, userId, jobId });
      await savedJobService.saveJob({ userId, jobId });

      expect(mockCache.del).toHaveBeenCalledWith(`saved_jobs_${userId}`);
    });

    it('should use cache for repeated queries', async () => {
      const userId = 1;
      const cachedJobs = [{ id: 1, userId, jobId: 100 }];

      mockCache.get.mockReturnValue(cachedJobs);

      const result1 = await savedJobService.getSavedJobsByUser(userId);
      const result2 = await savedJobService.getSavedJobsByUser(userId);

      expect(result1).toEqual(cachedJobs);
      expect(result2).toEqual(cachedJobs);
      expect(mockPrisma.savedJob.findMany).not.toHaveBeenCalled();
    });
  });
});
