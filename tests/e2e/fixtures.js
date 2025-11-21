// Test Fixtures for JobNaut E2E Tests
// Provides reusable test data and helper functions

const { test as base, expect } = require('@playwright/test');

/**
 * Test user credentials for authentication
 */
const testUsers = {
  validUser: {
    email: 'test.user@jobnaut.com',
    password: 'TestPassword123!',
    name: 'Test User',
    userId: 'test-user-id-123'
  },
  newUser: {
    email: `new.user.${Date.now()}@jobnaut.com`,
    password: 'NewPassword123!',
    name: 'New Test User'
  },
  invalidUser: {
    email: 'invalid@jobnaut.com',
    password: 'WrongPassword123!'
  }
};

/**
 * Sample job data for testing
 */
const sampleJobs = [
  {
    id: 'job-1',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    description: 'We are looking for an experienced software engineer to join our team.',
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    experienceLevel: 'senior',
    remote: true,
    postedDate: new Date().toISOString(),
    applicationLink: 'https://example.com/apply/job-1'
  },
  {
    id: 'job-2',
    title: 'Frontend Developer',
    company: 'WebSolutions LLC',
    location: 'New York, NY',
    description: 'Join our frontend team to build amazing user experiences.',
    skills: ['JavaScript', 'React', 'CSS', 'HTML'],
    experienceLevel: 'mid',
    remote: false,
    postedDate: new Date().toISOString(),
    applicationLink: 'https://example.com/apply/job-2'
  },
  {
    id: 'job-3',
    title: 'Full Stack Engineer',
    company: 'StartupXYZ',
    location: 'Remote',
    description: 'Build full-stack applications with modern technologies.',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'PostgreSQL'],
    experienceLevel: 'mid',
    remote: true,
    postedDate: new Date().toISOString(),
    applicationLink: 'https://example.com/apply/job-3'
  }
];

/**
 * Sample user skills for profile testing
 */
const sampleSkills = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Express',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'Kubernetes',
  'AWS'
];

/**
 * Helper functions for E2E tests
 */
class TestHelpers {
  /**
   * Login helper - navigates to login page and authenticates user
   * @param {import('@playwright/test').Page} page
   * @param {Object} credentials
   */
  static async login(page, credentials = testUsers.validUser) {
    await page.goto('/login');
    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|home)/);
  }

  /**
   * Logout helper
   * @param {import('@playwright/test').Page} page
   */
  static async logout(page) {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('/login');
  }

  /**
   * Navigate to job search
   * @param {import('@playwright/test').Page} page
   */
  static async navigateToJobSearch(page) {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="job-search-container"]');
  }

  /**
   * Search for jobs with query
   * @param {import('@playwright/test').Page} page
   * @param {string} query
   */
  static async searchJobs(page, query) {
    await page.fill('input[name="search"]', query);
    await page.click('button[type="submit"]');
    await page.waitForResponse(response =>
      response.url().includes('/api/jobs') && response.status() === 200
    );
  }

  /**
   * Wait for job results to load
   * @param {import('@playwright/test').Page} page
   */
  static async waitForJobResults(page) {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
  }

  /**
   * Save a job
   * @param {import('@playwright/test').Page} page
   * @param {string} jobId
   */
  static async saveJob(page, jobId) {
    await page.click(`[data-testid="save-job-${jobId}"]`);
    await page.waitForSelector(`[data-testid="unsave-job-${jobId}"]`);
  }

  /**
   * Unsave a job
   * @param {import('@playwright/test').Page} page
   * @param {string} jobId
   */
  static async unsaveJob(page, jobId) {
    await page.click(`[data-testid="unsave-job-${jobId}"]`);
    await page.waitForSelector(`[data-testid="save-job-${jobId}"]`);
  }

  /**
   * Navigate to user profile
   * @param {import('@playwright/test').Page} page
   */
  static async navigateToProfile(page) {
    await page.goto('/profile');
    await page.waitForSelector('[data-testid="profile-container"]');
  }

  /**
   * Update user profile
   * @param {import('@playwright/test').Page} page
   * @param {Object} profileData
   */
  static async updateProfile(page, profileData) {
    if (profileData.name) {
      await page.fill('input[name="name"]', profileData.name);
    }
    if (profileData.location) {
      await page.fill('input[name="location"]', profileData.location);
    }
    if (profileData.experienceLevel) {
      await page.selectOption('select[name="experienceLevel"]', profileData.experienceLevel);
    }

    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="profile-update-success"]');
  }

  /**
   * Add skills to profile
   * @param {import('@playwright/test').Page} page
   * @param {string[]} skills
   */
  static async addSkills(page, skills) {
    for (const skill of skills) {
      await page.fill('input[name="skill"]', skill);
      await page.click('button[data-testid="add-skill"]');
      await page.waitForSelector(`[data-testid="skill-tag-${skill}"]`);
    }
  }

  /**
   * Send a chat message
   * @param {import('@playwright/test').Page} page
   * @param {string} message
   */
  static async sendChatMessage(page, message) {
    await page.fill('textarea[name="message"]', message);
    await page.click('button[data-testid="send-message"]');
    await page.waitForSelector('[data-testid="ai-response"]');
  }

  /**
   * Clear chat history
   * @param {import('@playwright/test').Page} page
   */
  static async clearChatHistory(page) {
    await page.click('[data-testid="clear-history-button"]');
    await page.click('[data-testid="confirm-clear"]');
    await page.waitForSelector('[data-testid="empty-chat"]');
  }

  /**
   * Wait for API response
   * @param {import('@playwright/test').Page} page
   * @param {string} urlPattern
   */
  static async waitForApiResponse(page, urlPattern) {
    return await page.waitForResponse(response =>
      response.url().includes(urlPattern) && response.status() === 200
    );
  }

  /**
   * Take a screenshot with custom name
   * @param {import('@playwright/test').Page} page
   * @param {string} name
   */
  static async screenshot(page, name) {
    await page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Check if element is visible
   * @param {import('@playwright/test').Page} page
   * @param {string} selector
   */
  static async isVisible(page, selector) {
    try {
      await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text content of element
   * @param {import('@playwright/test').Page} page
   * @param {string} selector
   */
  static async getText(page, selector) {
    const element = await page.waitForSelector(selector);
    return await element.textContent();
  }

  /**
   * Count elements matching selector
   * @param {import('@playwright/test').Page} page
   * @param {string} selector
   */
  static async countElements(page, selector) {
    const elements = await page.$$(selector);
    return elements.length;
  }
}

/**
 * Custom test fixture with helpers
 */
const test = base.extend({
  helpers: async ({}, use) => {
    await use(TestHelpers);
  },
});

module.exports = {
  test,
  expect,
  testUsers,
  sampleJobs,
  sampleSkills,
  TestHelpers
};
