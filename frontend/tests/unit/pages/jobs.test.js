// Test for jobs page component
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import JobsPage from '../../../pages/jobs/index.vue';

// Mock the trpc client
vi.mock('../../src/api/trpcClient', () => ({
  default: {
    jobs: {
      search: {
        query: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: 1,
              title: 'Software Engineer',
              company: 'Tech Corp',
              location: 'San Francisco, CA',
              description: 'Exciting opportunity for a software engineer',
              skills: ['JavaScript', 'React'],
              postedDate: new Date().toISOString(),
            },
          ],
          totalCount: 1,
        }),
      },
    },
  },
}));

describe('JobsPage', () => {
  it('renders correctly', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
      },
    });

    // Wait for the component to load
    await wrapper.vm.$nextTick();

    expect(wrapper.exists()).toBe(true);
  });

  it('displays job listings', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
      },
    });

    // Wait for async operations
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if jobs are displayed
    expect(wrapper.text()).toContain('Job Listings');
  });
});
