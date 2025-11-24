// Job Search and Filtering E2E Tests for JobNaut
// Tests job search functionality, filters, and result display

const { test, expect, testUsers, sampleJobs } = require('./fixtures');

test.describe('Job Search and Filtering', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
    await helpers.navigateToJobSearch(page);
  });

  test.describe('Basic Search', () => {
    test('should display job search page correctly', async ({ page }) => {
      // Check for main search elements
      await expect(page.locator('[data-testid="job-search-container"]')).toBeVisible();
      await expect(page.locator('input[name="search"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should search for jobs by keyword', async ({ page, helpers }) => {
      // Search for "software engineer"
      await helpers.searchJobs(page, 'software engineer');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that results are displayed
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards.first()).toBeVisible();

      // Check that results contain search term
      const firstJobTitle = await page.locator('[data-testid="job-title"]').first().textContent();
      expect(firstJobTitle.toLowerCase()).toContain('software');
    });

    test('should show no results message for non-existent jobs', async ({ page, helpers }) => {
      // Search for non-existent job
      await helpers.searchJobs(page, 'xyzabc123nonexistent');

      // Should show no results message
      await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-results-message"]')).toContainText(/no jobs found|no results/i);
    });

    test('should display job count in results', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that job count is displayed
      await expect(page.locator('[data-testid="job-count"]')).toBeVisible();
      const countText = await page.locator('[data-testid="job-count"]').textContent();
      expect(countText).toMatch(/\d+\s+(jobs|results)/i);
    });

    test('should clear search query', async ({ page, helpers }) => {
      // Search for jobs
      await page.fill('input[name="search"]', 'software engineer');
      await helpers.searchJobs(page, 'software engineer');

      // Click clear button
      await page.click('[data-testid="clear-search"]');

      // Search field should be empty
      await expect(page.locator('input[name="search"]')).toHaveValue('');
    });
  });

  test.describe('Location Filtering', () => {
    test('should filter jobs by location', async ({ page, helpers }) => {
      // Fill location filter
      await page.fill('input[name="location"]', 'San Francisco');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that results contain location
      const firstJobLocation = await page.locator('[data-testid="job-location"]').first().textContent();
      expect(firstJobLocation.toLowerCase()).toContain('san francisco');
    });

    test('should filter for remote jobs only', async ({ page, helpers }) => {
      // Check remote filter
      await page.check('input[name="remote"]');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // All results should be remote
      const remoteLabels = page.locator('[data-testid="remote-label"]');
      await expect(remoteLabels.first()).toBeVisible();
    });

    test('should combine location and remote filters', async ({ page, helpers }) => {
      // Fill location and check remote
      await page.fill('input[name="location"]', 'California');
      await page.check('input[name="remote"]');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Should show remote jobs in California
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards.first()).toBeVisible();
    });
  });

  test.describe('Experience Level Filtering', () => {
    test('should filter jobs by entry level', async ({ page, helpers }) => {
      // Select entry level
      await page.selectOption('select[name="experienceLevel"]', 'entry');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that results are entry level
      const experienceTag = page.locator('[data-testid="experience-level"]').first();
      await expect(experienceTag).toContainText(/entry/i);
    });

    test('should filter jobs by senior level', async ({ page, helpers }) => {
      // Select senior level
      await page.selectOption('select[name="experienceLevel"]', 'senior');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that results are senior level
      const experienceTag = page.locator('[data-testid="experience-level"]').first();
      await expect(experienceTag).toContainText(/senior/i);
    });

    test('should filter jobs by mid level', async ({ page, helpers }) => {
      // Select mid level
      await page.selectOption('select[name="experienceLevel"]', 'mid');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that results are mid level
      const experienceTag = page.locator('[data-testid="experience-level"]').first();
      await expect(experienceTag).toContainText(/mid/i);
    });
  });

  test.describe('Skills Filtering', () => {
    test('should filter jobs by single skill', async ({ page, helpers }) => {
      // Add skill filter
      await page.fill('input[name="skills"]', 'React');
      await page.click('[data-testid="add-skill-filter"]');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Check that results contain React skill
      const skillTags = page.locator('[data-testid="job-skill"]');
      await expect(skillTags.first()).toBeVisible();
    });

    test('should filter jobs by multiple skills', async ({ page, helpers }) => {
      // Add multiple skill filters
      await page.fill('input[name="skills"]', 'React');
      await page.click('[data-testid="add-skill-filter"]');
      await page.fill('input[name="skills"]', 'Node.js');
      await page.click('[data-testid="add-skill-filter"]');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Results should contain jobs with these skills
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards.first()).toBeVisible();
    });

    test('should remove skill filter', async ({ page, helpers }) => {
      // Add skill filter
      await page.fill('input[name="skills"]', 'React');
      await page.click('[data-testid="add-skill-filter"]');

      // Remove skill filter
      await page.click('[data-testid="remove-skill-React"]');

      // Skill should be removed
      await expect(page.locator('[data-testid="skill-filter-React"]')).not.toBeVisible();
    });
  });

  test.describe('Combined Filters', () => {
    test('should apply multiple filters simultaneously', async ({ page, helpers }) => {
      // Apply multiple filters
      await page.fill('input[name="search"]', 'engineer');
      await page.fill('input[name="location"]', 'San Francisco');
      await page.selectOption('select[name="experienceLevel"]', 'senior');
      await page.check('input[name="remote"]');
      await page.click('button[type="submit"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Should show filtered results
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards.first()).toBeVisible();
    });

    test('should clear all filters', async ({ page, helpers }) => {
      // Apply filters
      await page.fill('input[name="search"]', 'engineer');
      await page.fill('input[name="location"]', 'San Francisco');
      await page.selectOption('select[name="experienceLevel"]', 'senior');

      // Click clear all filters
      await page.click('[data-testid="clear-all-filters"]');

      // All filters should be cleared
      await expect(page.locator('input[name="search"]')).toHaveValue('');
      await expect(page.locator('input[name="location"]')).toHaveValue('');
      await expect(page.locator('select[name="experienceLevel"]')).toHaveValue('');
    });
  });

  test.describe('Job Details', () => {
    test('should open job details modal', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Click on first job
      await page.click('[data-testid="job-card"]');

      // Should open modal with job details
      await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-company"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-description"]')).toBeVisible();
    });

    test('should close job details modal', async ({ page, helpers }) => {
      // Open job details
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);
      await page.click('[data-testid="job-card"]');

      // Close modal
      await page.click('[data-testid="close-modal"]');

      // Modal should be closed
      await expect(page.locator('[data-testid="job-details-modal"]')).not.toBeVisible();
    });

    test('should display all job information in details', async ({ page, helpers }) => {
      // Open job details
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);
      await page.click('[data-testid="job-card"]');

      // Check all required fields
      await expect(page.locator('[data-testid="job-details-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-company"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-location"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-skills"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-details-apply-button"]')).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should navigate to next page of results', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Click next page
      await page.click('[data-testid="next-page"]');

      // Wait for new results
      await helpers.waitForJobResults(page);

      // Page number should change
      await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
    });

    test('should navigate to previous page of results', async ({ page, helpers }) => {
      // Search for jobs and go to page 2
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);
      await page.click('[data-testid="next-page"]');
      await helpers.waitForJobResults(page);

      // Click previous page
      await page.click('[data-testid="prev-page"]');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Should be on page 1
      await expect(page.locator('[data-testid="current-page"]')).toContainText('1');
    });

    test('should change page size', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Get initial count
      const initialCount = await helpers.countElements(page, '[data-testid="job-card"]');

      // Change page size
      await page.selectOption('select[name="pageSize"]', '20');

      // Wait for results
      await helpers.waitForJobResults(page);

      // Count should change
      const newCount = await helpers.countElements(page, '[data-testid="job-card"]');
      expect(newCount).not.toBe(initialCount);
    });
  });

  test.describe('Sorting', () => {
    test('should sort jobs by date', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Sort by date
      await page.selectOption('select[name="sortBy"]', 'date');

      // Wait for results to update
      await helpers.waitForJobResults(page);

      // First job should be most recent
      const firstDate = await page.locator('[data-testid="job-date"]').first().textContent();
      expect(firstDate).toBeTruthy();
    });

    test('should sort jobs by relevance', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Sort by relevance
      await page.selectOption('select[name="sortBy"]', 'relevance');

      // Wait for results to update
      await helpers.waitForJobResults(page);

      // Results should be reordered
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards.first()).toBeVisible();
    });
  });
});
