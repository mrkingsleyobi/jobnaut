// Utility functions for mocking tRPC client in tests
import { vi } from 'vitest'

// Mock tRPC client with realistic API responses
export const createTRPCMock = () => {
  return {
    // User router mocks
    user: {
      getProfile: {
        query: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'user123',
            name: 'John Doe',
            email: 'john.doe@example.com',
            location: 'San Francisco, CA',
            bio: 'Software engineer with 5 years of experience in web development. Passionate about creating innovative solutions and learning new technologies.',
            skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker']
          }
        })
      },
      updateProfile: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'user123',
            name: 'John Doe',
            email: 'john.doe@example.com',
            location: 'San Francisco, CA',
            bio: 'Software engineer with 5 years of experience in web development. Passionant about creating innovative solutions and learning new technologies.',
            skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker']
          },
          message: 'Profile updated successfully'
        })
      },
      getSkills: {
        query: vi.fn().mockResolvedValue({
          success: true,
          data: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker'],
          count: 6
        })
      },
      addSkill: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          data: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker', 'Vue.js'],
          message: 'Skill added successfully'
        })
      },
      removeSkill: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          data: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
          message: 'Skill removed successfully'
        })
      },
      getPreferences: {
        query: vi.fn().mockResolvedValue({
          success: true,
          data: {
            emailNotifications: true,
            weeklyDigest: true,
            applicationUpdates: false
          }
        })
      },
      updatePreferences: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          data: {
            emailNotifications: false,
            weeklyDigest: true,
            applicationUpdates: true
          },
          message: 'Preferences updated successfully'
        })
      }
    },

    // Saved jobs router mocks
    savedJobs: {
      getSavedJobs: {
        query: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              id: 1,
              jobId: '1',
              userId: 'user123',
              notes: '',
              status: 'saved',
              createdAt: new Date().toISOString()
            },
            {
              id: 2,
              jobId: '3',
              userId: 'user123',
              notes: '',
              status: 'saved',
              createdAt: new Date().toISOString()
            }
          ],
          count: 2
        })
      },
      saveJob: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 3,
            jobId: '5',
            userId: 'user123',
            notes: '',
            status: 'saved',
            createdAt: new Date().toISOString()
          },
          message: 'Job saved successfully'
        })
      },
      removeSavedJob: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          message: 'Job removed successfully'
        })
      },
      updateSavedJob: {
        mutate: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 1,
            jobId: '1',
            userId: 'user123',
            notes: 'Interesting opportunity',
            status: 'applied',
            createdAt: new Date().toISOString()
          },
          message: 'Saved job updated successfully'
        })
      }
    },

    // Jobs router mocks (for job search and details)
    jobs: {
      search: {
        query: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: 1,
              title: 'Software Engineer',
              company: 'Tech Corp',
              location: 'San Francisco, CA',
              description: 'Exciting opportunity...',
              skills: ['JavaScript', 'React'],
              postedDate: new Date().toISOString(),
              experienceLevel: 'Mid Level',
              jobType: 'Full-time'
            }
          ],
          totalCount: 1,
          limit: 10,
          offset: 0
        })
      },
      getById: {
        query: vi.fn().mockResolvedValue({
          id: 1,
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          description: 'Exciting opportunity for a software engineer to join our team. We are looking for someone with experience in JavaScript, React, and Node.js. You will be working on cutting-edge web applications and collaborating with a talented team of developers. This is a great opportunity to grow your skills and advance your career in a dynamic environment. Responsibilities include developing new features, maintaining existing code, and participating in code reviews.',
          skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
          postedDate: new Date().toISOString(),
          applicationLink: 'https://example.com/apply/1',
          experienceLevel: 'Mid Level',
          jobType: 'Full-time'
        })
      }
    }
  }
}