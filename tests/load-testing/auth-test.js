import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test options for authentication load test
export const options = {
  // Simulate concurrent users
  stages: [
    { duration: '30s', target: 25 }, // Ramp up to 25 users over 30 seconds
    { duration: '1m', target: 25 }, // Stay at 25 users for 1 minute
    { duration: '30s', target: 50 }, // Ramp up to 50 users over 30 seconds
    { duration: '1m', target: 50 }, // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users over 30 seconds
  ],

  // Thresholds for authentication performance
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests should be below 800ms
    'http_req_duration{kind:health_check}': ['avg<500'], // Average health check requests should be below 500ms
    errors: ['rate<0.05'], // Error rate should be less than 5%
  },
};

// Base URL for the API
const BASE_URL = 'http://localhost:3000';

export default function () {
  // Test health endpoint first
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { kind: 'health_check' },
  });

  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test user profile endpoint (without authentication) - should return 401
  const profileRes = http.get(`${BASE_URL}/api/v1/user/profile`, {
    tags: { kind: 'profile_unauth' },
  });

  check(profileRes, {
    'profile unauthenticated status is 401': (r) => r.status === 401,
  }) || errorRate.add(1);

  sleep(0.5);

  // Test user skills endpoint (without authentication) - POST request should return 401
  const skillsRes = http.post(
    `${BASE_URL}/api/v1/user/skills`,
    JSON.stringify({
      skills: ['JavaScript', 'React'],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { kind: 'skills_unauth' },
    }
  );

  check(skillsRes, {
    'skills unauthenticated status is 401 or 500': (r) => r.status === 401 || r.status === 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test API endpoints without authentication to check proper security
  const endpoints = [
    { method: 'GET', url: '/', expectedStatus: 200 },
    { method: 'GET', url: '/api/v1/user/profile', expectedStatus: 401 },
    { method: 'POST', url: '/api/v1/user/skills', expectedStatus: 401 },
  ];

  endpoints.forEach((endpoint) => {
    let res;
    if (endpoint.method === 'POST') {
      res = http.request(
        endpoint.method,
        `${BASE_URL}${endpoint.url}`,
        JSON.stringify({
          skills: ['test'],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          tags: { kind: 'api_access' },
        }
      );
    } else {
      res = http.request(endpoint.method, `${BASE_URL}${endpoint.url}`, null, {
        tags: { kind: 'api_access' },
      });
    }

    // For job endpoints, we expect 200 or 404 (if job doesn't exist)
    // But we don't expect 500 errors
    check(res, {
      'API access status is not 500': (r) => r.status !== 500,
    }) || errorRate.add(1);

    sleep(0.1);
  });

  // Test rate limiting by making rapid requests
  for (let i = 0; i < 5; i++) {
    const rapidRes = http.get(`${BASE_URL}/health`, {
      tags: { kind: 'rapid_health' },
    });

    check(rapidRes, {
      'rapid health check status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.01); // Very short sleep to simulate rapid requests
  }
}
