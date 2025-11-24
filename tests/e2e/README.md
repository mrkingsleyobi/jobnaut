# JobNaut E2E Tests

Comprehensive end-to-end test suite for JobNaut using Playwright.

## Quick Start

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## Test Files

### 1. **auth.spec.js** - Authentication Tests
- Login with valid/invalid credentials
- Signup flow and validation
- Logout functionality
- Protected route access
- Session persistence
- Password reset

### 2. **job-search.spec.js** - Job Search Tests
- Basic keyword search
- Location filtering
- Remote job filtering
- Experience level filtering
- Skills-based filtering
- Combined filters
- Job details modal
- Pagination and sorting

### 3. **job-save.spec.js** - Job Management Tests
- Save jobs from search results
- Save jobs from details modal
- Unsave jobs
- Saved jobs page
- Saved jobs badge counter
- Apply from saved jobs

### 4. **profile.spec.js** - Profile Management Tests
- View user profile
- Edit profile information
- Add/remove skills
- Profile picture management
- Profile completeness indicator
- Account settings
- Privacy settings
- Resume/CV management

### 5. **chat.spec.js** - AI Chatbot Tests
- Send and receive messages
- Message display and formatting
- Conversation context maintenance
- Suggested questions
- Clear chat history
- Job recommendations in chat
- Error handling
- Chat persistence

### 6. **skill-gap.spec.js** - Skill Gap Analysis Tests
- Access skill gap analysis
- View current skills
- Select target job role
- Gap analysis visualization
- Missing skills identification
- Learning recommendations
- Job recommendations based on gap
- Track learning progress
- Compare with industry standards

## Test Structure

```
tests/e2e/
├── README.md            # This file
├── fixtures.js          # Test data and helpers
├── auth.spec.js         # 30+ authentication tests
├── job-search.spec.js   # 35+ job search tests
├── job-save.spec.js     # 25+ job save/unsave tests
├── profile.spec.js      # 30+ profile management tests
├── chat.spec.js         # 30+ chatbot interaction tests
└── skill-gap.spec.js    # 25+ skill gap analysis tests
```

**Total Tests: 175+ comprehensive E2E tests**

## Helper Functions

The `fixtures.js` file provides reusable helpers:

```javascript
const { test, expect, testUsers, TestHelpers } = require('./fixtures');

// Login helper
await TestHelpers.login(page, testUsers.validUser);

// Search jobs
await TestHelpers.searchJobs(page, 'software engineer');

// Save a job
await TestHelpers.saveJob(page, jobId);

// Navigate to profile
await TestHelpers.navigateToProfile(page);

// Send chat message
await TestHelpers.sendChatMessage(page, 'Hello');
```

## Running Specific Tests

```bash
# Run single test file
npx playwright test auth.spec.js

# Run specific test by name
npx playwright test -g "should successfully login"

# Run in specific browser
npm run test:e2e:chromium

# Run mobile tests
npm run test:e2e:mobile

# Debug specific test
npx playwright test auth.spec.js --debug
```

## Test Data

Test users and data are defined in `fixtures.js`:

- **testUsers.validUser**: Existing user for login tests
- **testUsers.newUser**: New user for signup tests
- **sampleJobs**: Sample job listings
- **sampleSkills**: Common skills for testing

## Browser Coverage

Tests run on:
- ✅ Chromium (Desktop & Mobile)
- ✅ Firefox (Desktop)
- ✅ WebKit (Desktop & Mobile)
- ✅ Mobile Chrome
- ✅ Mobile Safari

## Best Practices

1. **Use data-testid attributes** for element selection
2. **Wait for API responses** before assertions
3. **Keep tests independent** - no shared state
4. **Use helpers** from fixtures.js for common operations
5. **Add descriptive test names** that explain behavior
6. **Screenshot on failure** for debugging

## Debugging

```bash
# Run with Playwright Inspector
npm run test:e2e:debug

# Generate tests interactively
npm run test:e2e:codegen

# View test report
npm run test:e2e:report

# View traces (after failure)
npx playwright show-trace test-results/trace.zip
```

## CI/CD

Tests are configured to run in CI with:
- Automatic retries on failure
- Screenshot and video capture
- HTML and JSON reports
- Trace collection on first retry

See `/home/user/jobnaut/docs/E2E_TESTING.md` for detailed documentation.

## Adding New Tests

1. Create new spec file in `tests/e2e/`
2. Import fixtures: `const { test, expect } = require('./fixtures');`
3. Use `test.describe()` to group related tests
4. Add `test.beforeEach()` for setup (e.g., login)
5. Write tests with Arrange-Act-Assert pattern
6. Use helper functions from `fixtures.js`

Example:
```javascript
const { test, expect, testUsers } = require('./fixtures');

test.describe('New Feature', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login(page);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/feature');

    // Act
    await page.click('[data-testid="action-button"]');

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

## Resources

- [Full E2E Testing Documentation](/home/user/jobnaut/docs/E2E_TESTING.md)
- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

**Last Updated:** November 2025
**Test Count:** 175+ tests across 6 feature areas
**Browser Coverage:** 8 configurations (desktop + mobile)
