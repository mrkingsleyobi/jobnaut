#!/usr/bin/env node
/**
 * Environment Validation Test Script
 * Tests the envalid environment variable validation
 *
 * Usage: node scripts/test-env-validation.js
 */

const { execSync } = require('child_process');

const tests = [
  {
    name: 'Missing required variables',
    env: {},
    shouldFail: true,
    expectedError: 'Missing',
  },
  {
    name: 'Invalid AI provider',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      AI_PROVIDER: 'invalid',
    },
    shouldFail: true,
    expectedError: 'AI provider must be one of',
  },
  {
    name: 'Invalid PORT type',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      PORT: 'abc',
    },
    shouldFail: true,
    expectedError: 'Invalid number input',
  },
  {
    name: 'Invalid LOG_LEVEL',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      LOG_LEVEL: 'invalid',
    },
    shouldFail: true,
    expectedError: 'Log level must be one of',
  },
  {
    name: 'OpenAI provider without API key (dev mode - warns only)',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      AI_PROVIDER: 'openai',
      NODE_ENV: 'development',
    },
    shouldFail: false,
    expectedWarning: 'OPENAI_API_KEY is required',
  },
  {
    name: 'OpenAI provider without API key (production - fails)',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      AI_PROVIDER: 'openai',
      NODE_ENV: 'production',
      REDIS_URL: 'redis://production:6379',
      ENCRYPTION_KEY: 'production-encryption-key-32-chars-or-more-required',
      GRAFANA_ADMIN_PASSWORD: 'secure-password-not-default',
    },
    shouldFail: true,
    expectedError: 'OPENAI_API_KEY is required',
  },
  {
    name: 'Valid development configuration',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      AI_PROVIDER: 'mock',
      NODE_ENV: 'development',
    },
    shouldFail: false,
  },
  {
    name: 'Valid with OpenAI',
    env: {
      DATABASE_URL: 'postgresql://test',
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test123',
      NODE_ENV: 'development',
    },
    shouldFail: false,
  },
];

console.log('🧪 Running Environment Validation Tests\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
  process.stdout.write(`Testing: ${test.name}... `);

  // Build environment string
  const envString = Object.entries(test.env)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  try {
    execSync(
      `${envString} node -e "require('./config/env'); console.log('OK');"`,
      { stdio: 'pipe', encoding: 'utf-8' }
    );

    if (test.shouldFail) {
      console.log('❌ FAILED (expected to fail but passed)');
      failed++;
    } else {
      console.log('✓ PASSED');
      passed++;
    }
  } catch (error) {
    if (test.shouldFail) {
      const errorOutput = error.stderr || error.stdout || '';
      if (test.expectedError && !errorOutput.includes(test.expectedError)) {
        console.log(`❌ FAILED (wrong error: expected "${test.expectedError}")`);
        console.log(`   Got: ${errorOutput.substring(0, 100)}...`);
        failed++;
      } else {
        console.log('✓ PASSED (failed as expected)');
        passed++;
      }
    } else {
      console.log('❌ FAILED (unexpected error)');
      console.log(`   ${error.message}`);
      failed++;
    }
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All validation tests passed!');
