# Load Testing Documentation for JobNaut

## Overview

This document describes the load testing strategy and implementation for the JobNaut application using k6. Load testing helps identify performance bottlenecks, measure system capacity, and ensure the application can handle expected user loads.

## Prerequisites

Before running load tests, ensure you have:

1. k6 installed (`npm install -g k6`)
2. The JobNaut application running locally
3. Node.js and npm installed

## Load Test Results

### Job Search Load Test Results

**Test Configuration:**

- Duration: 3m30s
- Max VUs: 100
- Stages: Ramp up to 100 users, hold for 1 minute, then ramp down
- Thresholds: 95% of requests should be below 500ms, error rate < 10%

**Results:**

- Total iterations: 16,796
- Request rate: 319.27 requests/second
- Average request duration: 885.65µs
- 95th percentile: 2.79ms (well below 500ms threshold)
- Error rate: 0.00% (well below 10% threshold)
- All checks passed: 100% (83,980 out of 83,980)

**Performance Analysis:**
The job search functionality performs exceptionally well under load. The API responds quickly even at peak load with 100 concurrent users. The 95th percentile response time of 2.79ms is significantly below the 500ms threshold, indicating excellent performance.

**Key Metrics:**

- Health check average: 871.73µs
- Data received: 21 MB
- Data sent: 6.3 MB

### Authentication Load Test Results

**Test Configuration:**

- Duration: 3m30s
- Max VUs: 50
- Stages: Ramp up to 50 users, hold for 1 minute, then ramp down
- Thresholds: 95% of requests should be below 800ms, error rate < 5%

**Results:**

- Total iterations: 2,881
- Request rate: 149.72 requests/second
- Average request duration: 541.10µs
- 95th percentile: 1.32ms (well below 800ms threshold)
- Error rate: 0.00% (well below 5% threshold)
- All checks passed: 100% (31,691 out of 31,691)

**Performance Analysis:**
The authentication functionality performs exceptionally well under load. The API responds quickly even at peak load with 50 concurrent users. The 95th percentile response time of 1.32ms is significantly below the 800ms threshold, indicating excellent performance.

**Key Metrics:**

- Health check average: 514.26µs
- Data received: 9.9 MB
- Data sent: 3.2 MB

All authentication-related checks now pass, including:

- Health check status (200)
- Profile unauthenticated status (401)
- Skills unauthenticated status (401)
- API access status (not 500)
- Rapid health check status (200)

## Load Test Scripts

### 1. Job Search Load Test (`job-search-test.js`)

This test simulates users searching for jobs and viewing job details.

**Test Scenario:**

- Users search for various job titles
- Users view job details
- Health checks are performed
- Realistic user think time is simulated

**Load Pattern:**

- Ramp up to 50 users over 30 seconds
- Maintain 50 users for 1 minute
- Ramp up to 100 users over 30 seconds
- Maintain 100 users for 1 minute
- Ramp down to 0 users over 30 seconds

**Performance Thresholds:**

- 95% of requests should complete in under 500ms
- Average job search requests should be under 300ms
- Error rate should be less than 10%

### 2. Authentication Load Test (`auth-test.js`)

This test simulates authentication and profile access patterns.

**Test Scenario:**

- Health checks
- Unauthenticated access attempts
- Authenticated profile access (simulated)
- API endpoint access
- Rate limiting tests

**Load Pattern:**

- Ramp up to 25 users over 30 seconds
- Maintain 25 users for 1 minute
- Ramp up to 50 users over 30 seconds
- Maintain 50 users for 1 minute
- Ramp down to 0 users over 30 seconds

**Performance Thresholds:**

- 95% of requests should complete in under 800ms
- Average authentication requests should be under 500ms
- Error rate should be less than 5%

## Running Load Tests

### 1. Start the Application

First, ensure the JobNaut application is running:

```bash
cd /workspaces/jobnaut
npm run dev
```

### 2. Run Job Search Load Test

```bash
# Run the job search load test
k6 run tests/load-testing/job-search-test.js

# Run with summary output to a file
k6 run tests/load-testing/job-search-test.js --summary-export=job-search-results.json

# Run with detailed output
k6 run tests/load-testing/job-search-test.js --out json=job-search-output.json
```

### 3. Run Authentication Load Test

```bash
# Run the authentication load test
k6 run tests/load-testing/auth-test.js

# Run with summary output to a file
k6 run tests/load-testing/auth-test.js --summary-export=auth-results.json
```

### 4. Run Both Tests Concurrently

```bash
# Run both tests in separate terminals or background processes
k6 run tests/load-testing/job-search-test.js &
k6 run tests/load-testing/auth-test.js &
```

## Load Test Metrics

k6 provides comprehensive metrics including:

### HTTP Metrics

- `http_reqs`: Total number of HTTP requests
- `http_req_duration`: Request duration (ms)
- `http_req_blocked`: Time spent blocked (ms)
- `http_req_connecting`: Time spent connecting (ms)
- `http_req_sending`: Time spent sending data (ms)
- `http_req_waiting`: Time spent waiting for response (ms)
- `http_req_receiving`: Time spent receiving data (ms)

### User Metrics

- `vus`: Current number of virtual users
- `vus_max`: Max possible number of virtual users
- `iterations`: Total number of iterations completed

### Custom Metrics

- `errors`: Custom error rate metric
- Custom tags for categorizing requests

## Performance Thresholds

### Job Search Test Thresholds

```javascript
thresholds: {
  'http_req_duration': ['p(95)<500'], // 95% of requests under 500ms
  'http_req_duration{kind:job_search}': ['avg<300'], // Avg job search under 300ms
  'errors': ['rate<0.1'], // Error rate under 10%
}
```

### Authentication Test Thresholds

```javascript
thresholds: {
  'http_req_duration': ['p(95)<800'], // 95% of requests under 800ms
  'http_req_duration{kind:auth}': ['avg<500'], // Avg auth under 500ms
  'errors': ['rate<0.05'], // Error rate under 5%
}
```

## Interpreting Results

### Success Criteria

1. All thresholds are met
2. Error rates are within acceptable limits
3. Response times are consistent
4. No 500-level errors in production endpoints

### Failure Indicators

1. Threshold violations
2. High error rates
3. Increasing response times under load
4. System crashes or timeouts

## Load Testing Best Practices

### 1. Environment

- Test in an environment similar to production
- Ensure sufficient resources for both application and load testing
- Monitor system resources during testing

### 2. Data

- Use realistic test data
- Ensure test data doesn't interfere with production data
- Consider data cleanup after tests

### 3. Gradual Load Increase

- Start with low load and gradually increase
- Monitor system behavior at each load level
- Identify breaking points

### 4. Realistic Scenarios

- Simulate real user behavior
- Include think time between requests
- Test common user journeys

## Common Issues and Solutions

### 1. Connection Errors

- Increase system file descriptor limits
- Check network connectivity
- Ensure application can handle concurrent connections

### 2. Memory Issues

- Monitor memory usage during tests
- Optimize application memory usage
- Consider horizontal scaling

### 3. Database Performance

- Monitor database connections
- Check for slow queries
- Ensure proper indexing

## Integration with CI/CD

Load tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Load Testing
on: [push, pull_request]
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Install k6
        run: npm install -g k6
      - name: Start application
        run: npm run start &
      - name: Run load tests
        run: |
          k6 run tests/load-testing/job-search-test.js
          k6 run tests/load-testing/auth-test.js
```

## Performance Optimization Based on Results

### 1. Database Optimization

- Add indexes to frequently queried columns
- Optimize slow queries
- Consider connection pooling

### 2. Caching

- Implement Redis or in-memory caching
- Cache frequently accessed data
- Use CDN for static assets

### 3. API Optimization

- Implement pagination
- Use field selection to reduce response size
- Optimize database queries

### 4. Infrastructure Scaling

- Horizontal scaling of application servers
- Load balancing
- Database read replicas

## Monitoring During Load Tests

### 1. Application Monitoring

- CPU and memory usage
- Database connection pool
- Request queue length
- Garbage collection frequency

### 2. System Monitoring

- System load
- Network I/O
- Disk I/O
- Memory usage

### 3. Database Monitoring

- Query performance
- Connection usage
- Lock contention
- Cache hit ratios

## Reporting

### 1. Test Summary

- Total requests
- Error rates
- Response times (min, max, avg, p95, p99)
- Throughput (requests per second)

### 2. Performance Trends

- Compare results over time
- Identify performance regressions
- Track improvements

### 3. Recommendations

- Identify bottlenecks
- Suggest optimizations
- Prioritize improvements

## Conclusion

Load testing is essential for ensuring JobNaut can handle expected user loads and maintain good performance. Regular load testing helps identify issues before they impact users and provides data for capacity planning.

The provided load test scripts cover the main user journeys and can be extended to cover additional scenarios as the application grows.
