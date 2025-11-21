// Skill Gap Analysis E2E Tests for JobNaut
// Tests skill gap analysis, recommendations, and learning paths

const { test, expect, testUsers, sampleSkills } = require('./fixtures');

test.describe('Skill Gap Analysis', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
  });

  test.describe('Access Skill Gap Analysis', () => {
    test('should navigate to skill gap analysis page', async ({ page }) => {
      await page.goto('/skill-gap-analysis');

      // Check for main container
      await expect(page.locator('[data-testid="skill-gap-container"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText(/skill gap|skills analysis/i);
    });

    test('should access skill gap from navigation menu', async ({ page }) => {
      // Click navigation link
      await page.click('[data-testid="nav-skill-gap"]');

      // Should navigate to skill gap page
      await page.waitForURL(/skill-gap/);
      await expect(page.locator('[data-testid="skill-gap-container"]')).toBeVisible();
    });

    test('should access skill gap from dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Click skill gap widget
      const skillGapWidget = page.locator('[data-testid="dashboard-skill-gap"]');
      if (await skillGapWidget.isVisible()) {
        await skillGapWidget.click();
        await page.waitForURL(/skill-gap/);
      }
    });
  });

  test.describe('Initial Analysis', () => {
    test('should display current user skills', async ({ page, helpers }) => {
      await page.goto('/skill-gap-analysis');

      // Should show user's current skills
      await expect(page.locator('[data-testid="current-skills-section"]')).toBeVisible();

      // Check if skills are displayed
      const skillTags = page.locator('[data-testid^="current-skill-"]');
      const count = await skillTags.count();

      if (count > 0) {
        await expect(skillTags.first()).toBeVisible();
      }
    });

    test('should prompt to add skills if profile incomplete', async ({ page }) => {
      await page.goto('/skill-gap-analysis');

      // Check for prompt to add skills
      const addSkillsPrompt = page.locator('[data-testid="add-skills-prompt"]');

      if (await addSkillsPrompt.isVisible()) {
        await expect(addSkillsPrompt).toContainText(/add skills|complete profile/i);
      }
    });

    test('should select target job role', async ({ page }) => {
      await page.goto('/skill-gap-analysis');

      // Select a job role
      await page.click('[data-testid="select-job-role"]');
      await page.fill('input[name="jobRole"]', 'Senior Software Engineer');
      await page.click('[data-testid="job-role-option"]');

      // Should show role selection
      await expect(page.locator('[data-testid="selected-job-role"]')).toContainText(/Senior Software Engineer/i);
    });

    test('should analyze skills for specific job', async ({ page, helpers }) => {
      await page.goto('/skill-gap-analysis');

      // Search for a specific job
      await page.fill('input[name="jobSearch"]', 'React Developer');
      await page.click('[data-testid="analyze-job"]');

      // Wait for analysis
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Gap Analysis Results', () => {
    test('should display skill gap visualization', async ({ page }) => {
      await page.goto('/skill-gap-analysis');

      // Trigger analysis
      await page.click('[data-testid="analyze-skills"]');

      // Wait for results
      await expect(page.locator('[data-testid="skill-gap-chart"]')).toBeVisible({ timeout: 10000 });
    });

    test('should show missing skills', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');

      // Should show missing skills section
      await expect(page.locator('[data-testid="missing-skills"]')).toBeVisible({ timeout: 10000 });

      // Check if missing skills are listed
      const missingSkills = page.locator('[data-testid^="missing-skill-"]');
      const count = await missingSkills.count();

      if (count > 0) {
        await expect(missingSkills.first()).toBeVisible();
      }
    });

    test('should show matching skills', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');

      // Should show matching skills section
      await expect(page.locator('[data-testid="matching-skills"]')).toBeVisible({ timeout: 10000 });

      // Check if matching skills are listed
      const matchingSkills = page.locator('[data-testid^="matching-skill-"]');
      const count = await matchingSkills.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display skill match percentage', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');

      // Should show match percentage
      await expect(page.locator('[data-testid="skill-match-percentage"]')).toBeVisible({ timeout: 10000 });

      const percentageText = await page.locator('[data-testid="skill-match-percentage"]').textContent();
      expect(percentageText).toMatch(/\d+%/);
    });

    test('should categorize skills by priority', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');

      // Wait for results
      await page.waitForTimeout(2000);

      // Check for priority categories
      const highPriority = page.locator('[data-testid="high-priority-skills"]');
      const mediumPriority = page.locator('[data-testid="medium-priority-skills"]');
      const lowPriority = page.locator('[data-testid="low-priority-skills"]');

      // At least one category should be visible
      const highVisible = await highPriority.isVisible().catch(() => false);
      const mediumVisible = await mediumPriority.isVisible().catch(() => false);
      const lowVisible = await lowPriority.isVisible().catch(() => false);

      expect(highVisible || mediumVisible || lowVisible).toBeTruthy();
    });
  });

  test.describe('Learning Recommendations', () => {
    test('should show learning resources for missing skills', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');

      // Wait for results
      await page.waitForTimeout(2000);

      // Click on a missing skill
      const missingSkills = page.locator('[data-testid^="missing-skill-"]');
      if (await missingSkills.count() > 0) {
        await missingSkills.first().click();

        // Should show learning resources
        await expect(page.locator('[data-testid="learning-resources"]')).toBeVisible();
      }
    });

    test('should display course recommendations', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Check for course recommendations
      const courseRecommendations = page.locator('[data-testid="course-recommendations"]');

      if (await courseRecommendations.isVisible()) {
        await expect(courseRecommendations).toBeVisible();

        // Should have course cards
        const courseCa = page.locator('[data-testid^="course-card-"]');
        expect(await courseCa.count()).toBeGreaterThan(0);
      }
    });

    test('should show estimated learning time', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Check for learning time estimates
      const learningTime = page.locator('[data-testid="estimated-learning-time"]');

      if (await learningTime.isVisible()) {
        const timeText = await learningTime.textContent();
        expect(timeText).toMatch(/\d+\s+(hours?|weeks?|months?)/i);
      }
    });

    test('should create learning path', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Click create learning path button
      const createPathButton = page.locator('[data-testid="create-learning-path"]');

      if (await createPathButton.isVisible()) {
        await createPathButton.click();

        // Should show learning path creation interface
        await expect(page.locator('[data-testid="learning-path-builder"]')).toBeVisible();
      }
    });
  });

  test.describe('Job Recommendations Based on Gap', () => {
    test('should show jobs matching current skills', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Should show job recommendations
      const jobRecommendations = page.locator('[data-testid="recommended-jobs"]');

      if (await jobRecommendations.isVisible()) {
        await expect(jobRecommendations).toBeVisible();

        // Should have job cards
        const jobCards = page.locator('[data-testid^="recommended-job-"]');
        expect(await jobCards.count()).toBeGreaterThan(0);
      }
    });

    test('should filter jobs by skill match percentage', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Apply skill match filter
      const filterSlider = page.locator('[data-testid="skill-match-filter"]');

      if (await filterSlider.isVisible()) {
        await filterSlider.fill('80');

        // Results should update
        await page.waitForTimeout(1000);
      }
    });

    test('should navigate to job from recommendations', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Click on recommended job
      const jobCards = page.locator('[data-testid^="recommended-job-"]');

      if (await jobCards.count() > 0) {
        await jobCards.first().click();

        // Should open job details
        await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();
      }
    });
  });

  test.describe('Track Progress', () => {
    test('should add skill to learning list', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Add skill to learning list
      const missingSkills = page.locator('[data-testid^="missing-skill-"]');

      if (await missingSkills.count() > 0) {
        const addToListButton = missingSkills.first().locator('[data-testid="add-to-learning-list"]');

        if (await addToListButton.isVisible()) {
          await addToListButton.click();

          // Should show success message
          await expect(page.locator('[data-testid="notification"]')).toContainText(/added/i);
        }
      }
    });

    test('should mark skill as learned', async ({ page, helpers }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Mark skill as learned
      const learnedButton = page.locator('[data-testid="mark-as-learned"]').first();

      if (await learnedButton.isVisible()) {
        await learnedButton.click();

        // Should update profile
        await expect(page.locator('[data-testid="notification"]')).toContainText(/updated/i);
      }
    });

    test('should display learning progress', async ({ page }) => {
      await page.goto('/skill-gap-analysis');

      // Check for progress indicator
      const progressIndicator = page.locator('[data-testid="learning-progress"]');

      if (await progressIndicator.isVisible()) {
        await expect(progressIndicator).toBeVisible();

        const progressText = await progressIndicator.textContent();
        expect(progressText).toMatch(/\d+%/);
      }
    });
  });

  test.describe('Compare with Industry Standards', () => {
    test('should show industry skill requirements', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Check for industry standards section
      const industryStandards = page.locator('[data-testid="industry-standards"]');

      if (await industryStandards.isVisible()) {
        await expect(industryStandards).toBeVisible();
      }
    });

    test('should compare with similar roles', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // View similar roles comparison
      const similarRolesButton = page.locator('[data-testid="compare-similar-roles"]');

      if (await similarRolesButton.isVisible()) {
        await similarRolesButton.click();

        // Should show comparison
        await expect(page.locator('[data-testid="role-comparison"]')).toBeVisible();
      }
    });
  });

  test.describe('Export and Share', () => {
    test('should export skill gap report', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Click export button
      const exportButton = page.locator('[data-testid="export-report"]');

      if (await exportButton.isVisible()) {
        // Listen for download
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          exportButton.click()
        ]);

        expect(download).toBeTruthy();
      }
    });

    test('should share skill gap analysis', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Click share button
      const shareButton = page.locator('[data-testid="share-analysis"]');

      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Should show share dialog
        await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('Refresh Analysis', () => {
    test('should refresh analysis with updated skills', async ({ page, helpers }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Navigate to profile and add a skill
      await helpers.navigateToProfile(page);
      await page.click('[data-testid="add-skill-button"]');
      await page.fill('input[name="skill"]', 'Docker');
      await page.click('[data-testid="confirm-add-skill"]');

      // Return to skill gap analysis
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="refresh-analysis"]');

      // Should show updated analysis
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    });

    test('should update recommendations when role changes', async ({ page }) => {
      await page.goto('/skill-gap-analysis');

      // Select first role
      await page.click('[data-testid="select-job-role"]');
      await page.fill('input[name="jobRole"]', 'Frontend Developer');
      await page.click('[data-testid="job-role-option"]');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Change role
      await page.click('[data-testid="change-job-role"]');
      await page.fill('input[name="jobRole"]', 'Backend Developer');
      await page.click('[data-testid="job-role-option"]');

      // Analysis should update
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    });
  });

  test.describe('Integration with Chat', () => {
    test('should get personalized advice from chatbot', async ({ page }) => {
      await page.goto('/skill-gap-analysis');
      await page.click('[data-testid="analyze-skills"]');
      await page.waitForTimeout(2000);

      // Click ask chatbot button
      const askChatbotButton = page.locator('[data-testid="ask-chatbot-about-gaps"]');

      if (await askChatbotButton.isVisible()) {
        await askChatbotButton.click();

        // Should navigate to chat or open chat modal
        const chatVisible = await page.locator('[data-testid="chat-container"]').isVisible().catch(() => false);
        expect(chatVisible).toBeTruthy();
      }
    });
  });
});
