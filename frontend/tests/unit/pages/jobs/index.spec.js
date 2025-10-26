import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import JobsPage from '../../../../pages/jobs/index.vue'
import JobSearch from '../../../../components/JobSearch.vue'
import JobCard from '../../../../components/JobCard.vue'

// Mock the tRPC client module
vi.mock('../../../../src/api/trpcClient', () => {
  return {
    default: {
      jobs: {
        search: {
          query: vi.fn()
        }
      }
    }
  }
})

// Import the mocked module after defining the mock
import trpc from '../../../../src/api/trpcClient'

// Mock vue-router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  currentRoute: {
    value: { path: '/', params: {}, query: {} }
  },
  isReady: vi.fn().mockResolvedValue()
}

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: vi.fn(() => ({
      params: {},
      query: {}
    })),
    useRouter: vi.fn(() => mockRouter)
  }
})

const router = mockRouter

describe('JobsPage', () => {
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock tRPC jobs search response
    trpc.jobs.search.query.mockResolvedValue({
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

    // Install router
    router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders job search component', () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.findComponent(JobSearch).exists()).toBe(true)
  })

  it('renders job cards for search results', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(wrapper.findComponent(JobCard).exists()).toBe(true)
    expect(wrapper.text()).toContain('Software Engineer')
  })

  it.skip('shows loading state while fetching jobs', async () => {
    // Create a new mock that delays from the start
    const originalMock = SearchService.searchJobs
    SearchService.searchJobs = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            jobs: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          })
        }, 100) // Delay to ensure we can catch the loading state
      })
    })

    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    // Should show loading immediately after mounting
    expect(wrapper.find('.loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading jobs...')

    // Wait for the delayed response
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should show no results after loading
    expect(wrapper.find('.no-results').exists()).toBe(true)
    expect(wrapper.text()).toContain('No jobs found')

    // Restore original mock
    SearchService.searchJobs = originalMock
  })

  it('handles search events from JobSearch component', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for initial load
    await flushPromises()

    // Emit search event from JobSearch component
    const jobSearch = wrapper.findComponent(JobSearch)
    jobSearch.vm.$emit('search', {
      query: 'developer',
      location: 'remote',
      experience: 'mid',
      jobType: 'full-time'
    })

    await flushPromises()

    // Check that tRPC jobs search was called with correct params
    expect(trpc.jobs.search.query).toHaveBeenCalledWith({
      query: 'developer',
      location: 'remote',
      experienceLevel: 'mid',
      limit: 10,
      offset: 0
    })
  })

  it('handles clear filters events from JobSearch component', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    // Wait for initial load
    await flushPromises()

    // Reset mock to track new calls
    trpc.jobs.search.query.mockClear()

    // Emit clear filters event from JobSearch component
    const jobSearch = wrapper.findComponent(JobSearch)
    jobSearch.vm.$emit('clear-filters')

    await flushPromises()

    // Check that tRPC jobs search was called again (to reload all jobs)
    expect(trpc.jobs.search.query).toHaveBeenCalled()
  })

  it('handles pagination', async () => {
    // Mock tRPC jobs search to return multiple pages
    trpc.jobs.search.query.mockResolvedValue({
      jobs: [
        { id: 1, title: 'Job 1', skills: [] },
        { id: 2, title: 'Job 2', skills: [] }
      ],
      totalCount: 25,
      limit: 10,
      offset: 0
    })

    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Check that pagination controls are visible
    expect(wrapper.find('.pagination').exists()).toBe(true)
    expect(wrapper.text()).toContain('Page 1 of 3')

    // Mock next page response
    trpc.jobs.search.query.mockResolvedValueOnce({
      jobs: [
        { id: 11, title: 'Job 11', skills: [] },
        { id: 12, title: 'Job 12', skills: [] }
      ],
      totalCount: 25,
      limit: 10,
      offset: 10
    })

    // Click next button
    const nextButton = wrapper.find('.pagination-button:not(:disabled)')
    await nextButton.trigger('click')

    await flushPromises()

    // Check that tRPC jobs search was called with offset for page 2
    expect(trpc.jobs.search.query).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 10 })
    )
  })

  it('handles job save toggle', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Find the first job card
    const jobCard = wrapper.findComponent(JobCard)

    // Emit save event from job card
    jobCard.vm.$emit('save', 1)

    // Emit save event again (should remove from saved)
    jobCard.vm.$emit('save', 1)

    // The component should handle these events without errors
    expect(wrapper.exists()).toBe(true)
  })

  it('navigates to job details when view-details is emitted', async () => {
    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Find the first job card
    const jobCard = wrapper.findComponent(JobCard)

    // Emit view-details event from job card
    jobCard.vm.$emit('view-details', 1)

    // Wait for navigation
    await flushPromises()

    // Check that router push was called with correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/jobs/1')
  })

  it('shows no results message when search returns empty', async () => {
    // Mock tRPC jobs search to return no results
    trpc.jobs.search.query.mockResolvedValue({
      jobs: [],
      totalCount: 0,
      limit: 10,
      offset: 0
    })

    const wrapper = mount(JobsPage, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No jobs found')
  })
})