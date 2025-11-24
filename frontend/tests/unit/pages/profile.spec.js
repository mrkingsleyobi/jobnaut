import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ProfilePage from '../../../pages/profile.vue';

// Mock the tRPC client module
vi.mock('../../../src/api/trpcClient', () => {
  return {
    default: {
      user: {
        getProfile: {
          query: vi.fn(),
        },
        updateProfile: {
          mutate: vi.fn(),
        },
        addSkills: {
          mutate: vi.fn(),
        },
        removeSkills: {
          mutate: vi.fn(),
        },
        getPreferences: {
          query: vi.fn(),
        },
        updatePreferences: {
          mutate: vi.fn(),
        },
      },
      savedJobs: {
        getSavedJobs: {
          query: vi.fn(),
        },
        removeSavedJob: {
          mutate: vi.fn(),
        },
      },
    },
  };
});

// Import the mocked module after defining the mock
import trpc from '../../../src/api/trpcClient';

// Mock vue-router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  currentRoute: {
    value: { path: '/profile', params: {}, query: {} },
  },
  isReady: vi.fn().mockResolvedValue(),
};

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRoute: vi.fn(() => ({
      params: {},
      query: {},
    })),
    useRouter: vi.fn(() => mockRouter),
  };
});

const router = mockRouter;

// Mock window.alert
window.alert = vi.fn();

describe('ProfilePage', () => {
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock tRPC user getProfile response
    trpc.user.getProfile.query.mockResolvedValue({
      id: 'user123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      location: 'San Francisco, CA',
      bio: 'Software engineer with 5 years of experience in web development. Passionate about creating innovative solutions and learning new technologies.',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker'],
    });

    // Mock tRPC user updateProfile response
    trpc.user.updateProfile.mutate.mockResolvedValue({
      success: true,
      profile: {
        id: 'user123',
        name: 'Jane Smith',
        email: 'john.doe@example.com',
        location: 'New York, NY',
        bio: 'Updated bio information',
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker'],
      },
      message: 'Profile updated successfully',
    });

    // Mock tRPC user addSkills response
    trpc.user.addSkills.mutate.mockResolvedValue({
      success: true,
      profile: {
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Docker', 'Vue.js'],
      },
      message: 'Skill added successfully',
    });

    // Mock tRPC user removeSkills response
    trpc.user.removeSkills.mutate.mockResolvedValue({
      success: true,
      profile: {
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
      },
      message: 'Skill removed successfully',
    });

    // Mock tRPC savedJobs getSavedJobs response
    trpc.savedJobs.getSavedJobs.query.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          jobId: '1',
          userId: 'user123',
          notes: '',
          status: 'saved',
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          jobId: '3',
          userId: 'user123',
          notes: '',
          status: 'saved',
          createdAt: new Date().toISOString(),
        },
      ],
      count: 2,
    });

    // Mock tRPC savedJobs removeSavedJob response
    trpc.savedJobs.removeSavedJob.mutate.mockResolvedValue({
      success: true,
      message: 'Job removed successfully',
    });

    // Mock tRPC user getPreferences response
    trpc.user.getPreferences.query.mockResolvedValue({
      success: true,
      data: {
        emailNotifications: true,
        weeklyDigest: true,
        applicationUpdates: false,
      },
    });

    // Mock tRPC user updatePreferences response
    trpc.user.updatePreferences.mutate.mockResolvedValue({
      success: true,
      data: {
        emailNotifications: false,
        weeklyDigest: true,
        applicationUpdates: true,
      },
      message: 'Preferences updated successfully',
    });

    // Install router
    router.push('/profile');
    await router.isReady();

    // Clear router mocks
    mockRouter.push.mockClear();
  });

  it('renders profile header with user information', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for async operations to complete
    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(wrapper.text()).toContain('John Doe');
    expect(wrapper.text()).toContain('john.doe@example.com');
    expect(wrapper.text()).toContain('San Francisco, CA');
  });

  it('allows updating profile information', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for component to load completely
    await wrapper.vm.$nextTick();
    await flushPromises();

    // Find name input and change value
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Jane Smith');

    // Find location input and change value
    const locationInput = wrapper.find('#location');
    await locationInput.setValue('New York, NY');

    // Find bio textarea and change value
    const bioTextarea = wrapper.find('#bio');
    await bioTextarea.setValue('Updated bio information');

    // Click update button
    const updateButton = wrapper.find('.update-button');
    await updateButton.trigger('click');

    // Check that tRPC updateProfile was called with correct params
    expect(trpc.user.updateProfile.mutate).toHaveBeenCalledWith({
      name: 'Jane Smith',
      location: 'New York, NY',
      bio: 'Updated bio information',
    });

    // Check that alert was called
    expect(window.alert).toHaveBeenCalledWith('Profile updated successfully!');
  });

  it('allows adding and removing skills', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for component to load completely
    await wrapper.vm.$nextTick();
    await flushPromises();

    // Check initial skills count
    expect(wrapper.text()).toContain('6 skills');

    // Add a new skill
    const skillInput = wrapper.find('.skills-input .form-input');
    await skillInput.setValue('Vue.js');

    const addSkillButton = wrapper.find('.add-skill-button');
    await addSkillButton.trigger('click');

    // Check that tRPC addSkills was called
    expect(trpc.user.addSkills.mutate).toHaveBeenCalledWith({
      skills: ['Vue.js'],
    });

    // Remove a skill
    const removeButtons = wrapper.findAll('.remove-skill-button');
    await removeButtons[0].trigger('click');

    // Check that tRPC removeSkills was called
    expect(trpc.user.removeSkills.mutate).toHaveBeenCalledWith({
      skills: ['JavaScript'],
    });
  });

  it('allows saving and removing saved jobs', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for component to load completely
    await wrapper.vm.$nextTick();
    await flushPromises();

    // Check initial saved jobs count
    expect(wrapper.text()).toContain('2 saved');

    // Test view job button
    const viewButtons = wrapper.findAll('.view-button');
    if (viewButtons.length > 0) {
      await viewButtons[0].trigger('click');
      expect(mockRouter.push).toHaveBeenCalledWith('/jobs/1');
    }

    // Test remove job button
    const removeButtons = wrapper.findAll('.remove-button');
    if (removeButtons.length > 0) {
      await removeButtons[0].trigger('click');

      // Check that tRPC removeSavedJob was called
      expect(trpc.savedJobs.removeSavedJob.mutate).toHaveBeenCalledWith({
        userId: 'user123',
        jobId: '1',
      });
    }
  });

  // Preferences test removed as preferences section is no longer in the profile page

  it('shows empty state when no saved jobs', async () => {
    // Mock tRPC savedJobs getSavedJobs response to return empty array
    trpc.savedJobs.getSavedJobs.query.mockResolvedValueOnce({
      success: true,
      data: [],
      count: 0,
    });

    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for component to load with empty saved jobs
    await wrapper.vm.$nextTick();
    await flushPromises();

    // Check that empty state is displayed
    expect(wrapper.find('.no-saved-jobs').exists()).toBe(true);
    expect(wrapper.text()).toContain("You haven't saved any jobs yet");

    // Test browse jobs link
    const browseJobsLink = wrapper.find('.browse-jobs-link');
    expect(browseJobsLink.exists()).toBe(true);
  });

  it('navigates to jobs page when browse jobs link is clicked', async () => {
    // Mock tRPC savedJobs getSavedJobs response to return empty array
    trpc.savedJobs.getSavedJobs.query.mockResolvedValueOnce({
      success: true,
      data: [],
      count: 0,
    });

    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: {
            template: '<a href="/jobs" @click.prevent="() => router.push(\'/jobs\')"><slot /></a>',
            setup() {
              return { router: mockRouter };
            },
          },
        },
      },
    });

    // Wait for component to load with empty saved jobs
    await wrapper.vm.$nextTick();
    await flushPromises();

    const browseJobsLink = wrapper.find('.browse-jobs-link');
    await browseJobsLink.trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/jobs');
  });

  it('handles adding skill with Enter key', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for component to load completely
    await wrapper.vm.$nextTick();
    await flushPromises();

    // Add a new skill using Enter key
    const skillInput = wrapper.find('.skills-input .form-input');
    await skillInput.setValue('TypeScript');

    await skillInput.trigger('keyup.enter');

    // Check that tRPC addSkills was called
    expect(trpc.user.addSkills.mutate).toHaveBeenCalledWith({
      skills: ['TypeScript'],
    });
  });

  it('prevents adding empty skills', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: true,
        },
      },
    });

    // Wait for component to load completely
    await wrapper.vm.$nextTick();
    await flushPromises();

    // Try to add an empty skill
    const skillInput = wrapper.find('.skills-input .form-input');
    await skillInput.setValue('');

    const addSkillButton = wrapper.find('.add-skill-button');
    await addSkillButton.trigger('click');

    // Check that tRPC addSkills was not called
    expect(trpc.user.addSkills.mutate).not.toHaveBeenCalled();
  });
});
