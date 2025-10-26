import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';

// Mock user data store (in a real app, this would be a database)
const users = {
  'user123': {
    id: 'user123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    location: 'San Francisco, CA',
    bio: 'Software engineer with 5 years of experience in web development. Passionate about creating innovative solutions and learning new technologies.',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker'],
    preferences: {
      emailNotifications: true,
      weeklyDigest: true,
      applicationUpdates: false
    }
  }
};

// Define Zod schemas for input validation
const getUserProfileInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const updateUserProfileInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

const getUserSkillsInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const addUserSkillInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  skill: z.string().min(1, 'Skill is required'),
});

const removeUserSkillInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  skill: z.string().min(1, 'Skill is required'),
});

const getUserPreferencesInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const updateUserPreferencesInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  applicationUpdates: z.boolean().optional(),
});

export const userRouter = router({
  /**
   * Get user profile
   */
  getProfile: protectedProcedure
    .input(getUserProfileInput)
    .query(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        const { preferences, ...profile } = user;
        return {
          success: true,
          data: profile,
        };
      } catch (error) {
        throw new Error(`Failed to retrieve user profile: ${error.message}`);
      }
    }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(updateUserProfileInput)
    .mutation(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        // Update user fields if provided
        if (input.name !== undefined) user.name = input.name;
        if (input.location !== undefined) user.location = input.location;
        if (input.bio !== undefined) user.bio = input.bio;

        const { preferences, ...profile } = user;
        return {
          success: true,
          data: profile,
          message: 'Profile updated successfully',
        };
      } catch (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
    }),

  /**
   * Get user skills
   */
  getSkills: protectedProcedure
    .input(getUserSkillsInput)
    .query(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        return {
          success: true,
          data: user.skills,
          count: user.skills.length,
        };
      } catch (error) {
        throw new Error(`Failed to retrieve user skills: ${error.message}`);
      }
    }),

  /**
   * Add user skill
   */
  addSkill: protectedProcedure
    .input(addUserSkillInput)
    .mutation(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        // Check if skill already exists
        if (user.skills.includes(input.skill)) {
          throw new Error('Skill already exists');
        }

        // Add skill
        user.skills.push(input.skill);

        return {
          success: true,
          data: user.skills,
          message: 'Skill added successfully',
        };
      } catch (error) {
        throw new Error(`Failed to add skill: ${error.message}`);
      }
    }),

  /**
   * Remove user skill
   */
  removeSkill: protectedProcedure
    .input(removeUserSkillInput)
    .mutation(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        // Remove skill
        const index = user.skills.indexOf(input.skill);
        if (index === -1) {
          throw new Error('Skill not found');
        }

        user.skills.splice(index, 1);

        return {
          success: true,
          data: user.skills,
          message: 'Skill removed successfully',
        };
      } catch (error) {
        throw new Error(`Failed to remove skill: ${error.message}`);
      }
    }),

  /**
   * Get user preferences
   */
  getPreferences: protectedProcedure
    .input(getUserPreferencesInput)
    .query(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        return {
          success: true,
          data: user.preferences,
        };
      } catch (error) {
        throw new Error(`Failed to retrieve user preferences: ${error.message}`);
      }
    }),

  /**
   * Update user preferences
   */
  updatePreferences: protectedProcedure
    .input(updateUserPreferencesInput)
    .mutation(async ({ input }) => {
      try {
        const user = users[input.userId];
        if (!user) {
          throw new Error('User not found');
        }

        // Update preferences if provided
        if (input.emailNotifications !== undefined)
          user.preferences.emailNotifications = input.emailNotifications;
        if (input.weeklyDigest !== undefined)
          user.preferences.weeklyDigest = input.weeklyDigest;
        if (input.applicationUpdates !== undefined)
          user.preferences.applicationUpdates = input.applicationUpdates;

        return {
          success: true,
          data: user.preferences,
          message: 'Preferences updated successfully',
        };
      } catch (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
      }
    }),
});