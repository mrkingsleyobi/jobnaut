// Job Save/Unsave Workflow E2E Tests for JobNaut
// Tests saving, unsaving, and managing saved jobs

const { test, expect, testUsers } = require('./fixtures');

test.describe('Job Save/Unsave Workflow', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
    await helpers.navigateToJobSearch(page);
  });

  test.describe('Save Job', () => {
    test('should save a job from search results', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Get first job ID
      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      // Click save button
      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Should show saved state
      await expect(page.locator(`[data-testid="unsave-job-${jobId}"]`)).toBeVisible();

      // Should show success notification
      await expect(page.locator('[data-testid="notification"]')).toContainText(/saved/i);
    });

    test('should save a job from job details modal', async ({ page, helpers }) => {
      // Search and open job details
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);
      await page.click('[data-testid="job-card"]');

      // Wait for modal to open
      await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();

      // Click save button in modal
      await page.click('[data-testid="save-job-modal"]');

      // Should show saved state
      await expect(page.locator('[data-testid="unsave-job-modal"]')).toBeVisible();

      // Should show success notification
      await expect(page.locator('[data-testid="notification"]')).toContainText(/saved/i);
    });

    test('should persist saved job after page reload', async ({ page, helpers }) => {
      // Search and save a job
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      await page.click(`[data-testid="save-job-${jobId}"]`);
      await expect(page.locator(`[data-testid="unsave-job-${jobId}"]`)).toBeVisible();

      // Reload page
      await page.reload();
      await helpers.waitForJobResults(page);

      // Job should still be saved
      await expect(page.locator(`[data-testid="unsave-job-${jobId}"]`)).toBeVisible();
    });

    test('should save multiple jobs', async ({ page, helpers }) => {
      // Search for jobs
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Save first three jobs
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      const jobsToSave = Math.min(count, 3);

      for (let i = 0; i < jobsToSave; i++) {
        const jobId = await jobCards.nth(i).getAttribute('data-job-id');
        await page.click(`[data-testid="save-job-${jobId}"]`);
        await expect(page.locator(`[data-testid="unsave-job-${jobId}"]`)).toBeVisible();
      }

      // Navigate to saved jobs
      await page.goto('/saved-jobs');

      // Should see all saved jobs
      const savedJobCards = page.locator('[data-testid="saved-job-card"]');
      const savedCount = await savedJobCards.count();
      expect(savedCount).toBeGreaterThanOrEqual(jobsToSave);
    });
  });

  test.describe('Unsave Job', () => {
    test('should unsave a job from search results', async ({ page, helpers }) => {
      // Search and save a job first
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      await page.click(`[data-testid="save-job-${jobId}"]`);
      await expect(page.locator(`[data-testid="unsave-job-${jobId}"]`)).toBeVisible();

      // Now unsave it
      await page.click(`[data-testid="unsave-job-${jobId}"]`);

      // Should show unsaved state
      await expect(page.locator(`[data-testid="save-job-${jobId}"]`)).toBeVisible();

      // Should show success notification
      await expect(page.locator('[data-testid="notification"]')).toContainText(/removed|unsaved/i);
    });

    test('should unsave a job from job details modal', async ({ page, helpers }) => {
      // Search, save, and open job details
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      await page.click(`[data-testid="save-job-${jobId}"]`);
      await page.click('[data-testid="job-card"]');

      // Wait for modal
      await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();

      // Unsave from modal
      await page.click('[data-testid="unsave-job-modal"]');

      // Should show unsaved state
      await expect(page.locator('[data-testid="save-job-modal"]')).toBeVisible();
    });

    test('should unsave a job from saved jobs page', async ({ page, helpers }) => {
      // Save a job first
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Navigate to saved jobs
      await page.goto('/saved-jobs');

      // Unsave the job
      await page.click(`[data-testid="unsave-job-${jobId}"]`);

      // Job should be removed from list
      await expect(page.locator(`[data-testid="saved-job-card"][data-job-id="${jobId}"]`)).not.toBeVisible();
    });
  });

  test.describe('Saved Jobs Page', () => {
    test('should display saved jobs page', async ({ page, helpers }) => {
      await page.goto('/saved-jobs');

      // Check for saved jobs container
      await expect(page.locator('[data-testid="saved-jobs-container"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText(/saved jobs/i);
    });

    test('should show empty state when no jobs saved', async ({ page, helpers }) => {
      // Clear all saved jobs first (if any)
      await page.goto('/saved-jobs');

      // Check if there are any saved jobs and remove them
      const savedJobCards = page.locator('[data-testid="saved-job-card"]');
      const count = await savedJobCards.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const jobId = await savedJobCards.first().getAttribute('data-job-id');
          await page.click(`[data-testid="unsave-job-${jobId}"]`);
        }
      }

      // Should show empty state
      await expect(page.locator('[data-testid="empty-saved-jobs"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-saved-jobs"]')).toContainText(/no saved jobs|haven't saved/i);
    });

    test('should display saved jobs count', async ({ page, helpers }) => {
      // Save some jobs
      await helpers.navigateToJobSearch(page);
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const jobCards = page.locator('[data-testid="job-card"]');
      const jobId = await jobCards.first().getAttribute('data-job-id');
      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Navigate to saved jobs
      await page.goto('/saved-jobs');

      // Should show count
      await expect(page.locator('[data-testid="saved-jobs-count"]')).toBeVisible();
      const countText = await page.locator('[data-testid="saved-jobs-count"]').textContent();
      expect(countText).toMatch(/\d+/);
    });

    test('should open job details from saved jobs', async ({ page, helpers }) => {
      // Save a job first
      await helpers.navigateToJobSearch(page);
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const jobCards = page.locator('[data-testid="job-card"]');
      const jobId = await jobCards.first().getAttribute('data-job-id');
      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Go to saved jobs
      await page.goto('/saved-jobs');

      // Click on saved job
      await page.click('[data-testid="saved-job-card"]');

      // Should open details modal
      await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();
    });

    test('should filter saved jobs by search', async ({ page, helpers }) => {
      // Go to saved jobs
      await page.goto('/saved-jobs');

      // Search within saved jobs
      await page.fill('input[name="search-saved"]', 'engineer');
      await page.click('[data-testid="search-saved-button"]');

      // Results should be filtered
      const savedJobCards = page.locator('[data-testid="saved-job-card"]');
      if (await savedJobCards.count() > 0) {
        const firstTitle = await savedJobCards.first().locator('[data-testid="job-title"]').textContent();
        expect(firstTitle.toLowerCase()).toContain('engineer');
      }
    });

    test('should sort saved jobs', async ({ page, helpers }) => {
      // Go to saved jobs
      await page.goto('/saved-jobs');

      // Sort by date saved
      await page.selectOption('select[name="sort-saved"]', 'dateSaved');

      // Wait for reordering
      await page.waitForTimeout(500);

      // Jobs should be reordered
      const savedJobCards = page.locator('[data-testid="saved-job-card"]');
      await expect(savedJobCards.first()).toBeVisible();
    });
  });

  test.describe('Saved Jobs Badge', () => {
    test('should show saved jobs count in navigation', async ({ page, helpers }) => {
      // Save a job
      await helpers.navigateToJobSearch(page);
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const jobCards = page.locator('[data-testid="job-card"]');
      const jobId = await jobCards.first().getAttribute('data-job-id');
      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Check navigation badge
      await expect(page.locator('[data-testid="saved-jobs-badge"]')).toBeVisible();
      const badgeText = await page.locator('[data-testid="saved-jobs-badge"]').textContent();
      expect(parseInt(badgeText)).toBeGreaterThan(0);
    });

    test('should update badge count when saving/unsaving', async ({ page, helpers }) => {
      // Navigate to job search
      await helpers.navigateToJobSearch(page);
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      // Get initial badge count
      const initialBadgeText = await page.locator('[data-testid="saved-jobs-badge"]').textContent();
      const initialCount = parseInt(initialBadgeText) || 0;

      // Save a job
      const jobCards = page.locator('[data-testid="job-card"]');
      const jobId = await jobCards.first().getAttribute('data-job-id');
      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Badge should increment
      await page.waitForTimeout(500);
      const newBadgeText = await page.locator('[data-testid="saved-jobs-badge"]').textContent();
      const newCount = parseInt(newBadgeText);
      expect(newCount).toBe(initialCount + 1);

      // Unsave the job
      await page.click(`[data-testid="unsave-job-${jobId}"]`);

      // Badge should decrement
      await page.waitForTimeout(500);
      const finalBadgeText = await page.locator('[data-testid="saved-jobs-badge"]').textContent();
      const finalCount = parseInt(finalBadgeText) || 0;
      expect(finalCount).toBe(initialCount);
    });
  });

  test.describe('Apply from Saved Jobs', () => {
    test('should apply to job from saved jobs page', async ({ page, helpers }) => {
      // Save a job first
      await helpers.navigateToJobSearch(page);
      await helpers.searchJobs(page, 'engineer');
      await helpers.waitForJobResults(page);

      const jobCards = page.locator('[data-testid="job-card"]');
      const jobId = await jobCards.first().getAttribute('data-job-id');
      await page.click(`[data-testid="save-job-${jobId}"]`);

      // Go to saved jobs
      await page.goto('/saved-jobs');

      // Click apply button
      await page.click('[data-testid="saved-job-card"]');
      await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();
      await page.click('[data-testid="apply-button"]');

      // Should navigate to application link or show confirmation
      // (This depends on implementation - may open new tab or show modal)
    });
  });
});
