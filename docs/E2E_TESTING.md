# E2E Testing with Playwright - JobNaut

This document provides comprehensive guidance for running and writing end-to-end (E2E) tests for the JobNaut application using Playwright.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

JobNaut uses Playwright for end-to-end testing, providing comprehensive test coverage across:

- **Authentication flows** (login, signup, logout)
- **Job search and filtering**
- **Job save/unsave workflows**
- **User profile management**
- **AI chatbot interactions**
- **Skill gap analysis**

### Test Coverage

- **Total Test Files**: 6
- **Test Categories**: 6 major feature areas
- **Browser Coverage**: Chromium, Firefox, WebKit
- **Mobile Testing**: iOS and Android viewports

## Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Running JobNaut backend server

### Installation

1. **Install Playwright and dependencies:**

```bash
npm install -D @playwright/test
npx playwright install
```

2. **Install browser dependencies (if needed):**

```bash
npx playwright install-deps
```

3. **Verify installation:**

```bash
npx playwright --version
```

### Environment Configuration

Create a `.env.test` file for E2E testing (optional):

```env
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test.user@jobnaut.com
TEST_USER_PASSWORD=TestPassword123!
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with Playwright UI
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Generate test code interactively
npm run test:e2e:codegen
```

### Browser-Specific Tests

```bash
# Run tests in Chromium only
npm run test:e2e:chromium

# Run tests in Firefox only
npm run test:e2e:firefox

# Run tests in WebKit only
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile
```

### Specific Test Files

```bash
# Run authentication tests only
npx playwright test auth.spec.js

# Run job search tests only
npx playwright test job-search.spec.js

# Run with specific tag
npx playwright test --grep @smoke
```

### View Test Reports

```bash
# Open HTML report
npm run test:e2e:report

# View JSON report
cat test-results/results.json
```

## Test Structure

### Directory Layout

```
tests/e2e/
├── fixtures.js           # Test data and helper functions
├── auth.spec.js         # Authentication flow tests
├── job-search.spec.js   # Job search and filtering tests
├── job-save.spec.js     # Save/unsave job workflow tests
├── profile.spec.js      # Profile management tests
├── chat.spec.js         # AI chatbot interaction tests
└── skill-gap.spec.js    # Skill gap analysis tests
```

### Configuration Files

- **playwright.config.js**: Main Playwright configuration
- **fixtures.js**: Reusable test data and helper functions

## Writing New Tests

### Test File Template

```javascript
// Feature E2E Tests for JobNaut
// Brief description of what this test file covers

const { test, expect, testUsers } = require('./fixtures');

test.describe('Feature Name', () => {
  // Setup hook
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
    // Additional setup
  });

  test.describe('Sub-feature', () => {
    test('should do something specific', async ({ page }) => {
      // Arrange
      await page.goto('/feature-path');

      // Act
      await page.click('[data-testid="some-button"]');

      // Assert
      await expect(page.locator('[data-testid="result"]')).toBeVisible();
    });
  });
});
```

### Using Test Fixtures

The `fixtures.js` file provides:

1. **Test Users:**
   ```javascript
   const { testUsers } = require('./fixtures');

   // Valid user
   testUsers.validUser.email
   testUsers.validUser.password

   // New user for signup
   testUsers.newUser.email
   ```

2. **Sample Data:**
   ```javascript
   const { sampleJobs, sampleSkills } = require('./fixtures');
   ```

3. **Helper Functions:**
   ```javascript
   const { TestHelpers } = require('./fixtures');

   // Login helper
   await TestHelpers.login(page, credentials);

   // Search jobs
   await TestHelpers.searchJobs(page, 'engineer');

   // Save job
   await TestHelpers.saveJob(page, jobId);
   ```

### Test Locators

Use `data-testid` attributes for stable element selection:

```javascript
// Good: Stable test identifier
await page.click('[data-testid="login-button"]');

// Avoid: Fragile selectors
await page.click('.btn.btn-primary'); // CSS classes may change
await page.click('button:has-text("Login")'); // Text may change
```

### Assertions

```javascript
// Visibility checks
await expect(page.locator('[data-testid="element"]')).toBeVisible();
await expect(page.locator('[data-testid="element"]')).not.toBeVisible();

// Text content
await expect(page.locator('[data-testid="title"]')).toContainText('Expected Text');

// Attribute checks
await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');

// URL checks
await expect(page).toHaveURL(/dashboard/);

// Count checks
await expect(page.locator('[data-testid="job-card"]')).toHaveCount(10);
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```javascript
// Good
test.beforeEach(async ({ page, helpers }) => {
  await helpers.login(page);
  // Set up test-specific state
});

// Avoid
let sharedState; // Don't share state between tests
```

### 2. Use Page Object Pattern

For complex pages, create page objects:

```javascript
class JobSearchPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.locator('input[name="search"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async search(query) {
    await this.searchInput.fill(query);
    await this.submitButton.click();
  }
}
```

### 3. Wait for Network Requests

```javascript
// Wait for API response
await page.waitForResponse(response =>
  response.url().includes('/api/jobs') && response.status() === 200
);

// Wait for multiple requests
await Promise.all([
  page.waitForResponse('/api/jobs'),
  page.click('[data-testid="search-button"]')
]);
```

### 4. Handle Dynamic Content

```javascript
// Wait for dynamic content
await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

// Wait for loading to disappear
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });
```

### 5. Screenshot on Failure

```javascript
test('should display dashboard', async ({ page }) => {
  try {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  } catch (error) {
    await page.screenshot({ path: 'test-results/dashboard-failure.png' });
    throw error;
  }
});
```

### 6. Test Timeouts

```javascript
// Set timeout for specific test
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // Long-running test
});

// Set timeout for action
await page.click('[data-testid="submit"]', { timeout: 5000 });
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start server
        run: npm start &
        env:
          NODE_ENV: test

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Docker Integration

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "test:e2e"]
```

## Troubleshooting

### Common Issues

1. **Browser installation fails:**
   ```bash
   # Try manual installation
   npx playwright install chromium firefox webkit

   # Or install dependencies separately
   npx playwright install-deps
   ```

2. **Tests timeout:**
   - Increase timeout in `playwright.config.js`
   - Check if server is running
   - Verify network conditions

3. **Element not found:**
   - Add explicit waits: `await page.waitForSelector()`
   - Check if element uses `data-testid`
   - Verify element is in viewport

4. **Flaky tests:**
   - Add proper waits for network requests
   - Use stable locators (data-testid)
   - Avoid hardcoded delays (`waitForTimeout`)

5. **Authentication issues:**
   - Verify test user credentials
   - Check authentication middleware
   - Clear cookies between tests

### Debug Mode

```bash
# Run in debug mode with inspector
npm run test:e2e:debug

# Run specific test in debug
npx playwright test auth.spec.js --debug

# Pause test execution
await page.pause(); // Add in test code
```

### Viewing Traces

```bash
# Enable trace in config (already configured for failures)
# View trace
npx playwright show-trace test-results/trace.zip
```

## Test Maintenance

### Regular Tasks

1. **Update test data** in `fixtures.js` when features change
2. **Add new test IDs** to components as features are added
3. **Review and update timeouts** based on application performance
4. **Keep Playwright updated:**
   ```bash
   npm update @playwright/test
   npx playwright install
   ```

### Performance Optimization

- Run tests in parallel (configured by default)
- Use `fullyParallel: true` for faster execution
- Skip unnecessary tests in development with `.skip()`
- Use test tags for selective execution

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

For issues or questions:
1. Check this documentation
2. Review Playwright docs
3. Check existing test files for examples
4. Create an issue in the project repository

---

**Last Updated:** November 2025
**Playwright Version:** v1.40.0+
**Node.js Version:** 18.0.0+
