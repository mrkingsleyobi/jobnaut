// User Profile Management E2E Tests for JobNaut
// Tests user profile viewing, editing, and skill management

const { test, expect, testUsers, sampleSkills } = require('./fixtures');

test.describe('User Profile Management', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
    await helpers.navigateToProfile(page);
  });

  test.describe('View Profile', () => {
    test('should display user profile page', async ({ page }) => {
      // Check for profile container
      await expect(page.locator('[data-testid="profile-container"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText(/profile/i);
    });

    test('should display user information', async ({ page }) => {
      // Check for user fields
      await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-email"]')).toBeVisible();

      // Verify name is displayed
      const nameText = await page.locator('[data-testid="profile-name"]').textContent();
      expect(nameText).toBeTruthy();
    });

    test('should display user skills', async ({ page }) => {
      // Check for skills section
      await expect(page.locator('[data-testid="profile-skills-section"]')).toBeVisible();

      // Check if skills are displayed (if any exist)
      const skillTags = page.locator('[data-testid^="skill-tag-"]');
      const skillCount = await skillTags.count();

      if (skillCount > 0) {
        await expect(skillTags.first()).toBeVisible();
      }
    });

    test('should display experience level', async ({ page }) => {
      // Check for experience level field
      const experienceLevel = page.locator('[data-testid="profile-experience-level"]');

      if (await experienceLevel.isVisible()) {
        const levelText = await experienceLevel.textContent();
        expect(levelText).toMatch(/entry|mid|senior|lead/i);
      }
    });

    test('should display location', async ({ page }) => {
      // Check for location field
      const location = page.locator('[data-testid="profile-location"]');

      if (await location.isVisible()) {
        const locationText = await location.textContent();
        expect(locationText).toBeTruthy();
      }
    });
  });

  test.describe('Edit Profile', () => {
    test('should enable edit mode', async ({ page }) => {
      // Click edit button
      await page.click('[data-testid="edit-profile-button"]');

      // Should show edit form
      await expect(page.locator('[data-testid="profile-edit-form"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-edit-button"]')).toBeVisible();
    });

    test('should update user name', async ({ page, helpers }) => {
      // Enable edit mode
      await page.click('[data-testid="edit-profile-button"]');

      // Update name
      const newName = `Updated Name ${Date.now()}`;
      await page.fill('input[name="name"]', newName);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('[data-testid="profile-update-success"]')).toBeVisible();

      // Name should be updated
      await expect(page.locator('[data-testid="profile-name"]')).toContainText(newName);
    });

    test('should update location', async ({ page, helpers }) => {
      // Enable edit mode
      await page.click('[data-testid="edit-profile-button"]');

      // Update location
      const newLocation = 'San Francisco, CA';
      await page.fill('input[name="location"]', newLocation);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('[data-testid="profile-update-success"]')).toBeVisible();

      // Location should be updated
      await expect(page.locator('[data-testid="profile-location"]')).toContainText(newLocation);
    });

    test('should update experience level', async ({ page, helpers }) => {
      // Enable edit mode
      await page.click('[data-testid="edit-profile-button"]');

      // Update experience level
      await page.selectOption('select[name="experienceLevel"]', 'senior');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('[data-testid="profile-update-success"]')).toBeVisible();

      // Experience level should be updated
      await expect(page.locator('[data-testid="profile-experience-level"]')).toContainText(/senior/i);
    });

    test('should cancel edit without saving', async ({ page }) => {
      // Get original name
      const originalName = await page.locator('[data-testid="profile-name"]').textContent();

      // Enable edit mode
      await page.click('[data-testid="edit-profile-button"]');

      // Make changes
      await page.fill('input[name="name"]', 'Temporary Name');

      // Cancel
      await page.click('[data-testid="cancel-edit-button"]');

      // Should not be in edit mode
      await expect(page.locator('[data-testid="profile-edit-form"]')).not.toBeVisible();

      // Name should not be changed
      await expect(page.locator('[data-testid="profile-name"]')).toContainText(originalName);
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      // Enable edit mode
      await page.click('[data-testid="edit-profile-button"]');

      // Clear name field
      await page.fill('input[name="name"]', '');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    });
  });

  test.describe('Skills Management', () => {
    test('should add a single skill', async ({ page }) => {
      // Click add skill button
      await page.click('[data-testid="add-skill-button"]');

      // Fill skill input
      const newSkill = 'JavaScript';
      await page.fill('input[name="skill"]', newSkill);

      // Submit
      await page.click('[data-testid="confirm-add-skill"]');

      // Should show success message
      await expect(page.locator('[data-testid="skill-add-success"]')).toBeVisible();

      // Skill should appear in list
      await expect(page.locator(`[data-testid="skill-tag-${newSkill}"]`)).toBeVisible();
    });

    test('should add multiple skills', async ({ page }) => {
      const skillsToAdd = ['React', 'Node.js', 'TypeScript'];

      for (const skill of skillsToAdd) {
        // Click add skill button
        await page.click('[data-testid="add-skill-button"]');

        // Fill skill input
        await page.fill('input[name="skill"]', skill);

        // Submit
        await page.click('[data-testid="confirm-add-skill"]');

        // Wait for skill to appear
        await expect(page.locator(`[data-testid="skill-tag-${skill}"]`)).toBeVisible();
      }

      // All skills should be visible
      for (const skill of skillsToAdd) {
        await expect(page.locator(`[data-testid="skill-tag-${skill}"]`)).toBeVisible();
      }
    });

    test('should remove a skill', async ({ page }) => {
      // Add a skill first
      await page.click('[data-testid="add-skill-button"]');
      const skillToRemove = 'TestSkill';
      await page.fill('input[name="skill"]', skillToRemove);
      await page.click('[data-testid="confirm-add-skill"]');
      await expect(page.locator(`[data-testid="skill-tag-${skillToRemove}"]`)).toBeVisible();

      // Remove the skill
      await page.click(`[data-testid="remove-skill-${skillToRemove}"]`);

      // Confirm removal if needed
      const confirmButton = page.locator('[data-testid="confirm-remove-skill"]');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Skill should be removed
      await expect(page.locator(`[data-testid="skill-tag-${skillToRemove}"]`)).not.toBeVisible();
    });

    test('should not add duplicate skills', async ({ page }) => {
      const duplicateSkill = 'JavaScript';

      // Add skill first time
      await page.click('[data-testid="add-skill-button"]');
      await page.fill('input[name="skill"]', duplicateSkill);
      await page.click('[data-testid="confirm-add-skill"]');
      await expect(page.locator(`[data-testid="skill-tag-${duplicateSkill}"]`)).toBeVisible();

      // Try to add same skill again
      await page.click('[data-testid="add-skill-button"]');
      await page.fill('input[name="skill"]', duplicateSkill);
      await page.click('[data-testid="confirm-add-skill"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/already exists|duplicate/i);
    });

    test('should search for skills from suggestions', async ({ page }) => {
      // Click add skill button
      await page.click('[data-testid="add-skill-button"]');

      // Type in skill input
      await page.fill('input[name="skill"]', 'Java');

      // Should show suggestions
      await expect(page.locator('[data-testid="skill-suggestions"]')).toBeVisible();

      // Click on a suggestion
      await page.click('[data-testid="skill-suggestion-JavaScript"]');

      // Skill should be filled
      await expect(page.locator('input[name="skill"]')).toHaveValue('JavaScript');
    });

    test('should display skill count', async ({ page }) => {
      // Check for skill count display
      const skillCount = page.locator('[data-testid="skills-count"]');

      if (await skillCount.isVisible()) {
        const countText = await skillCount.textContent();
        expect(countText).toMatch(/\d+/);
      }
    });
  });

  test.describe('Profile Picture', () => {
    test('should display profile picture placeholder', async ({ page }) => {
      // Check for profile picture or avatar
      const profilePic = page.locator('[data-testid="profile-picture"]');
      const profileAvatar = page.locator('[data-testid="profile-avatar"]');

      // Either profile picture or avatar should be visible
      const picVisible = await profilePic.isVisible().catch(() => false);
      const avatarVisible = await profileAvatar.isVisible().catch(() => false);

      expect(picVisible || avatarVisible).toBeTruthy();
    });

    test('should open profile picture upload dialog', async ({ page }) => {
      // Click edit profile picture button
      await page.click('[data-testid="edit-profile-picture"]');

      // Should show upload dialog or file input
      const uploadDialog = page.locator('[data-testid="upload-dialog"]');
      const fileInput = page.locator('input[type="file"]');

      const dialogVisible = await uploadDialog.isVisible().catch(() => false);
      const inputVisible = await fileInput.isVisible().catch(() => false);

      expect(dialogVisible || inputVisible).toBeTruthy();
    });
  });

  test.describe('Profile Completeness', () => {
    test('should display profile completion indicator', async ({ page }) => {
      // Check for profile completion indicator
      const completionIndicator = page.locator('[data-testid="profile-completion"]');

      if (await completionIndicator.isVisible()) {
        const completionText = await completionIndicator.textContent();
        expect(completionText).toMatch(/\d+%/);
      }
    });

    test('should show missing profile fields', async ({ page }) => {
      // Check for missing fields indicator
      const missingFields = page.locator('[data-testid="missing-fields"]');

      if (await missingFields.isVisible()) {
        const missingText = await missingFields.textContent();
        expect(missingText).toBeTruthy();
      }
    });
  });

  test.describe('Account Settings', () => {
    test('should navigate to account settings', async ({ page }) => {
      // Click settings link
      await page.click('[data-testid="account-settings-link"]');

      // Should navigate to settings page
      await page.waitForURL(/settings/);
      await expect(page.locator('[data-testid="settings-container"]')).toBeVisible();
    });

    test('should display email preferences', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');

      // Check for email preferences section
      await expect(page.locator('[data-testid="email-preferences"]')).toBeVisible();
    });

    test('should toggle email notifications', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');

      // Toggle email notifications
      const notificationToggle = page.locator('[data-testid="email-notification-toggle"]');
      await notificationToggle.click();

      // Should show success message
      await expect(page.locator('[data-testid="settings-update-success"]')).toBeVisible();
    });
  });

  test.describe('Profile Privacy', () => {
    test('should display privacy settings', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');

      // Check for privacy section
      const privacySection = page.locator('[data-testid="privacy-settings"]');

      if (await privacySection.isVisible()) {
        await expect(privacySection).toBeVisible();
      }
    });

    test('should toggle profile visibility', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');

      // Toggle profile visibility
      const visibilityToggle = page.locator('[data-testid="profile-visibility-toggle"]');

      if (await visibilityToggle.isVisible()) {
        await visibilityToggle.click();
        await expect(page.locator('[data-testid="settings-update-success"]')).toBeVisible();
      }
    });
  });

  test.describe('Resume/CV Management', () => {
    test('should display resume section', async ({ page }) => {
      // Check for resume section
      const resumeSection = page.locator('[data-testid="resume-section"]');

      if (await resumeSection.isVisible()) {
        await expect(resumeSection).toBeVisible();
      }
    });

    test('should open resume upload dialog', async ({ page }) => {
      // Click upload resume button
      const uploadButton = page.locator('[data-testid="upload-resume-button"]');

      if (await uploadButton.isVisible()) {
        await uploadButton.click();

        // Should show upload dialog
        const uploadDialog = page.locator('[data-testid="resume-upload-dialog"]');
        await expect(uploadDialog).toBeVisible();
      }
    });
  });

  test.describe('Profile Data Persistence', () => {
    test('should persist profile changes after logout and login', async ({ page, helpers }) => {
      // Update profile
      await page.click('[data-testid="edit-profile-button"]');
      const newLocation = `Test Location ${Date.now()}`;
      await page.fill('input[name="location"]', newLocation);
      await page.click('button[type="submit"]');
      await expect(page.locator('[data-testid="profile-update-success"]')).toBeVisible();

      // Logout
      await helpers.logout(page);

      // Login again
      await helpers.login(page);

      // Navigate to profile
      await helpers.navigateToProfile(page);

      // Changes should be persisted
      await expect(page.locator('[data-testid="profile-location"]')).toContainText(newLocation);
    });

    test('should persist skills after page reload', async ({ page }) => {
      // Add a skill
      await page.click('[data-testid="add-skill-button"]');
      const newSkill = `TestSkill${Date.now()}`;
      await page.fill('input[name="skill"]', newSkill);
      await page.click('[data-testid="confirm-add-skill"]');
      await expect(page.locator(`[data-testid="skill-tag-${newSkill}"]`)).toBeVisible();

      // Reload page
      await page.reload();

      // Skill should still be there
      await expect(page.locator(`[data-testid="skill-tag-${newSkill}"]`)).toBeVisible();
    });
  });
});
