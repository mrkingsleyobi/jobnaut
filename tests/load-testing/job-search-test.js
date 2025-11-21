import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test options
export const options = {
  // Ramp up users
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users over 30 seconds
    { duration: '1m', target: 50 }, // Stay at 50 users for 1 minute
    { duration: '30s', target: 100 }, // Ramp up to 100 users over 30 seconds
    { duration: '1m', target: 100 }, // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users over 30 seconds
  ],

  // Thresholds for performance expectations
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_duration{kind:health_check}': ['avg<300'], // Average health check requests should be below 300ms
    'http_req_duration{kind:trpc}': ['avg<400'], // Average tRPC requests should be below 400ms
    errors: ['rate<0.1'], // Error rate should be less than 10%
  },
};

// Base URL for the API
const BASE_URL = 'http://localhost:3000';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { kind: 'health_check' },
  });

  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response has status OK': (r) => {
      try {
        return r.json().status === 'OK';
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(0.5);

  // Test tRPC job search endpoint (public endpoint)
  // Using tRPC query parameter format
  const jobSearchRes = http.get(
    `${BASE_URL}/trpc/jobs.search?input=${encodeURIComponent(
      JSON.stringify({
        query: 'software',
        limit: 10,
        offset: 0,
      })
    )}`,
    {
      tags: { kind: 'trpc' },
    }
  );

  check(jobSearchRes, {
    'job search status is 200': (r) => r.status === 200,
    'job search response has jobs': (r) => {
      try {
        const data = r.json();
        return data.result && data.result.data && Array.isArray(data.result.data.jobs);
      } catch (e) {
        return false;
      }
    },
    'job search response has pagination': (r) => {
      try {
        const data = r.json();
        return data.result && data.result.data && typeof data.result.data.totalCount === 'number';
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(0.5);

  // Test tRPC job details endpoint (public endpoint)
  const jobDetailsRes = http.get(
    `${BASE_URL}/trpc/jobs.getById?input=${encodeURIComponent(
      JSON.stringify({
        id: 1,
      })
    )}`,
    {
      tags: { kind: 'trpc' },
    }
  );

  check(jobDetailsRes, {
    'job details status is 200': (r) => r.status === 200,
    'job details response has job data': (r) => {
      try {
        const data = r.json();
        return data.result && data.result.data && typeof data.result.data.id === 'number';
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);
}
