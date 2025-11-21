// Test suite for SavedJob Model Service

// Load environment variables
require('dotenv').config({ path: '.env.test' });

// Mock the database client
const mockPrisma = {
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

// Import savedJob service once
const savedJobService = require('../../src/models/savedJob');

describe('SavedJob Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
  });

  describe('saveJob', () => {
    it('should create a saved job successfully', async () => {
      const savedJobData = {
        userId: 1,
        jobId: 100,
        notes: 'Interesting position',
        applicationStatus: 'considering',
      };

      const mockSavedJob = {
        id: 1,
        ...savedJobData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.savedJob.create.mockResolvedValue(mockSavedJob);

      const result = await savedJobService.saveJob(savedJobData);

      expect(result).toEqual(mockSavedJob);
      expect(mockPrisma.savedJob.create).toHaveBeenCalledWith({
        data: savedJobData,
      });
      expect(mockCache.del).toHaveBeenCalledWith('saved_jobs_1');
    });

    it('should save job without optional fields', async () => {
      const savedJobData = {
        userId: 1,
        jobId: 100,
      };

      const mockSavedJob = {
        id: 1,
        ...savedJobData,
        notes: null,
        applicationStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.savedJob.create.mockResolvedValue(mockSavedJob);

      const result = await savedJobService.saveJob(savedJobData);

      expect(result).toEqual(mockSavedJob);
      expect(mockCache.del).toHaveBeenCalled();
    });

    it('should invalidate user cache after saving', async () => {
      const savedJobData = {
        userId: 123,
        jobId: 456,
      };

      mockPrisma.savedJob.create.mockResolvedValue({ id: 1, ...savedJobData });

      await savedJobService.saveJob(savedJobData);

      expect(mockCache.del).toHaveBeenCalledWith('saved_jobs_123');
    });

    it('should throw error on duplicate save attempt', async () => {
      const savedJobData = {
        userId: 1,
        jobId: 100,
      };

      mockPrisma.savedJob.create.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(savedJobService.saveJob(savedJobData)).rejects.toThrow();
    });
  });

  describe('getSavedJobsByUser', () => {
    it('should return saved jobs for a user', async () => {
      const userId = 1;
      const mockSavedJobs = [
        {
          id: 1,
          userId,
          jobId: 100,
          notes: 'Note 1',
          job: { id: 100, title: 'Software Engineer', company: 'Tech Corp' },
        },
        {
          id: 2,
          userId,
          jobId: 101,
          notes: 'Note 2',
          job: { id: 101, title: 'Senior Developer', company: 'StartUp Inc' },
        },
      ];

      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findMany.mockResolvedValue(mockSavedJobs);

      const result = await savedJobService.getSavedJobsByUser(userId);

      expect(result).toEqual(mockSavedJobs);
      expect(mockPrisma.savedJob.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { job: true },
      });
      expect(mockCache.set).toHaveBeenCalledWith('saved_jobs_1', mockSavedJobs);
    });

    it('should return cached saved jobs if available', async () => {
      const userId = 1;
      const cachedJobs = [{ id: 1, userId, jobId: 100 }];

      mockCache.get.mockReturnValue(cachedJobs);

      const result = await savedJobService.getSavedJobsByUser(userId);

      expect(result).toEqual(cachedJobs);
      expect(mockPrisma.savedJob.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array for user with no saved jobs', async () => {
      const userId = 1;

      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findMany.mockResolvedValue([]);

      const result = await savedJobService.getSavedJobsByUser(userId);

      expect(result).toEqual([]);
      expect(mockCache.set).toHaveBeenCalledWith('saved_jobs_1', []);
    });
  });

  describe('getSavedJob', () => {
    it('should return a specific saved job', async () => {
      const userId = 1;
      const jobId = 100;
      const mockSavedJob = {
        id: 1,
        userId,
        jobId,
        notes: 'Interesting position',
        job: { id: 100, title: 'Software Engineer' },
      };

      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findUnique.mockResolvedValue(mockSavedJob);

      const result = await savedJobService.getSavedJob(userId, jobId);

      expect(result).toEqual(mockSavedJob);
      expect(mockPrisma.savedJob.findUnique).toHaveBeenCalledWith({
        where: {
          userId_jobId: { userId, jobId },
        },
        include: { job: true },
      });
      expect(mockCache.set).toHaveBeenCalledWith('saved_job_1_100', mockSavedJob);
    });

    it('should return cached saved job if available', async () => {
      const userId = 1;
      const jobId = 100;
      const cachedJob = { id: 1, userId, jobId };

      mockCache.get.mockReturnValue(cachedJob);

      const result = await savedJobService.getSavedJob(userId, jobId);

      expect(result).toEqual(cachedJob);
      expect(mockPrisma.savedJob.findUnique).not.toHaveBeenCalled();
    });

    it('should return null for non-existent saved job', async () => {
      const userId = 1;
      const jobId = 999;

      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findUnique.mockResolvedValue(null);

      const result = await savedJobService.getSavedJob(userId, jobId);

      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('updateSavedJob', () => {
    it('should update saved job successfully', async () => {
      const userId = 1;
      const jobId = 100;
      const updateData = {
        notes: 'Updated notes',
        applicationStatus: 'applied',
      };

      const mockUpdatedJob = {
        id: 1,
        userId,
        jobId,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.savedJob.update.mockResolvedValue(mockUpdatedJob);

      const result = await savedJobService.updateSavedJob(userId, jobId, updateData);

      expect(result).toEqual(mockUpdatedJob);
      expect(mockPrisma.savedJob.update).toHaveBeenCalledWith({
        where: {
          userId_jobId: { userId, jobId },
        },
        data: updateData,
      });
    });

    it('should invalidate cache after update', async () => {
      const userId = 1;
      const jobId = 100;
      const updateData = { notes: 'Updated' };

      mockPrisma.savedJob.update.mockResolvedValue({ id: 1, userId, jobId, ...updateData });

      await savedJobService.updateSavedJob(userId, jobId, updateData);

      expect(mockCache.del).toHaveBeenCalledWith('saved_job_1_100');
      expect(mockCache.del).toHaveBeenCalledWith('saved_jobs_1');
    });

    it('should update application status', async () => {
      const userId = 1;
      const jobId = 100;
      const updateData = { applicationStatus: 'interviewed' };

      mockPrisma.savedJob.update.mockResolvedValue({ id: 1, userId, jobId, ...updateData });

      const result = await savedJobService.updateSavedJob(userId, jobId, updateData);

      expect(result.applicationStatus).toBe('interviewed');
    });

    it('should throw error for non-existent saved job', async () => {
      const userId = 1;
      const jobId = 999;
      const updateData = { notes: 'Updated' };

      mockPrisma.savedJob.update.mockRejectedValue(new Error('Record not found'));

      await expect(savedJobService.updateSavedJob(userId, jobId, updateData)).rejects.toThrow();
    });
  });

  describe('deleteSavedJob', () => {
    it('should delete saved job successfully', async () => {
      const userId = 1;
      const jobId = 100;
      const mockDeletedJob = {
        id: 1,
        userId,
        jobId,
        notes: 'Deleted job',
      };

      mockPrisma.savedJob.delete.mockResolvedValue(mockDeletedJob);

      const result = await savedJobService.deleteSavedJob(userId, jobId);

      expect(result).toEqual(mockDeletedJob);
      expect(mockPrisma.savedJob.delete).toHaveBeenCalledWith({
        where: {
          userId_jobId: { userId, jobId },
        },
      });
    });

    it('should invalidate cache after deletion', async () => {
      const userId = 1;
      const jobId = 100;

      mockPrisma.savedJob.delete.mockResolvedValue({ id: 1, userId, jobId });

      await savedJobService.deleteSavedJob(userId, jobId);

      expect(mockCache.del).toHaveBeenCalledWith('saved_job_1_100');
      expect(mockCache.del).toHaveBeenCalledWith('saved_jobs_1');
    });

    it('should throw error when deleting non-existent saved job', async () => {
      const userId = 1;
      const jobId = 999;

      mockPrisma.savedJob.delete.mockRejectedValue(new Error('Record not found'));

      await expect(savedJobService.deleteSavedJob(userId, jobId)).rejects.toThrow();
    });
  });

  describe('cache management', () => {
    it('should use different cache keys for different users', async () => {
      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findMany.mockResolvedValue([]);

      await savedJobService.getSavedJobsByUser(1);
      await savedJobService.getSavedJobsByUser(2);

      expect(mockCache.get).toHaveBeenCalledWith('saved_jobs_1');
      expect(mockCache.get).toHaveBeenCalledWith('saved_jobs_2');
    });

    it('should use composite cache key for specific saved job', async () => {
      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findUnique.mockResolvedValue(null);

      await savedJobService.getSavedJob(1, 100);

      expect(mockCache.get).toHaveBeenCalledWith('saved_job_1_100');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const savedJobData = { userId: 1, jobId: 100 };
      mockPrisma.savedJob.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(savedJobService.saveJob(savedJobData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle query timeout errors', async () => {
      mockCache.get.mockReturnValue(null);
      mockPrisma.savedJob.findMany.mockRejectedValue(new Error('Query timeout'));

      await expect(savedJobService.getSavedJobsByUser(1)).rejects.toThrow('Query timeout');
    });
  });
});
