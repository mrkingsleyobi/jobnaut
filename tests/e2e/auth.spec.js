// Authentication E2E Tests for JobNaut
// Tests user login, signup, logout, and authentication flows

const { test, expect, testUsers } = require('./fixtures');

test.describe('Authentication Flows', () => {
  test.describe('Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in login form
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL(/\/(dashboard|home)/);

      // Should see user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in login form with invalid credentials
      await page.fill('input[name="email"]', testUsers.invalidUser.email);
      await page.fill('input[name="password"]', testUsers.invalidUser.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid|incorrect/i);

      // Should stay on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Submit form without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'SomePassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show email format error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login');

      // Fill in password
      await page.fill('input[name="password"]', 'TestPassword123!');

      // Password should be hidden
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');

      // Click toggle button
      await page.click('[data-testid="toggle-password"]');

      // Password should be visible
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');

      // Click toggle again
      await page.click('[data-testid="toggle-password"]');

      // Password should be hidden again
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Signup', () => {
    test('should successfully create new account', async ({ page }) => {
      await page.goto('/signup');

      // Fill in signup form
      await page.fill('input[name="name"]', testUsers.newUser.name);
      await page.fill('input[name="email"]', testUsers.newUser.email);
      await page.fill('input[name="password"]', testUsers.newUser.password);
      await page.fill('input[name="confirmPassword"]', testUsers.newUser.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard or onboarding
      await page.waitForURL(/\/(dashboard|onboarding)/);

      // Should see welcome message or user menu
      const welcomeVisible = await page.locator('[data-testid="welcome-message"]').isVisible().catch(() => false);
      const userMenuVisible = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);

      expect(welcomeVisible || userMenuVisible).toBeTruthy();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.goto('/signup');

      // Fill in signup form with mismatched passwords
      await page.fill('input[name="name"]', testUsers.newUser.name);
      await page.fill('input[name="email"]', testUsers.newUser.email);
      await page.fill('input[name="password"]', testUsers.newUser.password);
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('[data-testid="password-match-error"]')).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/signup');

      // Fill in signup form with weak password
      await page.fill('input[name="name"]', testUsers.newUser.name);
      await page.fill('input[name="email"]', testUsers.newUser.email);
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show weak password error
      await expect(page.locator('[data-testid="password-strength-error"]')).toBeVisible();
    });

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/signup');

      // Fill in signup form with existing email
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', testUsers.validUser.email);
      await page.fill('input[name="password"]', testUsers.validUser.password);
      await page.fill('input[name="confirmPassword"]', testUsers.validUser.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show email exists error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/already exists|taken/i);
    });
  });

  test.describe('Logout', () => {
    test('should successfully logout authenticated user', async ({ page, helpers }) => {
      // Login first
      await helpers.login(page);

      // Click logout
      await helpers.logout(page);

      // Should redirect to login page
      await expect(page).toHaveURL(/login/);

      // Should not see user menu
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });

    test('should clear session after logout', async ({ page, helpers }) => {
      // Login first
      await helpers.login(page);

      // Logout
      await helpers.logout(page);

      // Try to navigate to protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated user to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL(/login/);
    });

    test('should allow authenticated user to access protected routes', async ({ page, helpers }) => {
      // Login first
      await helpers.login(page);

      // Navigate to protected routes
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/dashboard/);

      await page.goto('/profile');
      await expect(page).toHaveURL(/profile/);

      await page.goto('/jobs');
      await expect(page).toHaveURL(/jobs/);
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page reloads', async ({ page, helpers }) => {
      // Login
      await helpers.login(page);

      // Reload page
      await page.reload();

      // Should still be authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should maintain session across navigation', async ({ page, helpers }) => {
      // Login
      await helpers.login(page);

      // Navigate between pages
      await page.goto('/jobs');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      await page.goto('/profile');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should navigate to password reset page', async ({ page }) => {
      await page.goto('/login');

      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');

      // Should navigate to password reset page
      await expect(page).toHaveURL(/reset-password|forgot-password/);
    });

    test('should show success message after reset email sent', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill in email
      await page.fill('input[name="email"]', testUsers.validUser.email);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/email sent|check your email/i);
    });
  });
});
