# Performance Optimization Guide

## Performance Targets (SLOs)

### Response Time Targets

- **Fast**: ≤100ms - Excellent user experience
- **Acceptable**: ≤500ms - Good user experience
- **Slow**: >1000ms - Poor experience, needs optimization

### Database Query Targets

- **Fast**: ≤10ms - Well-optimized query
- **Acceptable**: ≤50ms - Acceptable performance
- **Slow**: >100ms - Requires optimization

### Resource Limits

- **Memory**: Keep heap usage below 80%
- **CPU**: Target <50% average utilization
- **Cache Hit Rate**: Target >70% for cached queries

## Implemented Optimizations

### 1. Database Query Optimization

**Location**: `/src/utils/queryOptimizer.js`

**Features**:
- Query result caching with 5-minute TTL
- Automatic cache invalidation on mutations
- Connection pooling optimization
- Slow query logging (>100ms)
- Prepared statement support
- Query performance tracking

**Usage**:
```javascript
const { cachedQuery, queryBuilders } = require('./utils/queryOptimizer');

// Use cached query
const jobs = await cachedQuery('job', 'findMany', {
  where: { location: 'Remote' }
}, { ttl: 300 });

// Use optimized query builder
const user = await queryBuilders.findUser({ id: userId });
```

**Benefits**:
- 60-80% reduction in database load for repeated queries
- Faster response times for cached data
- Automatic cache management

### 2. Response Compression

**Location**: `/src/index.js` (compression middleware)

**Features**:
- Gzip compression for JSON/text responses
- Automatic compression level adjustment
- Reduced bandwidth usage

**Configuration**:
```javascript
const compression = require('compression');

app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**Benefits**:
- 60-80% reduction in response size
- Faster page loads
- Reduced bandwidth costs

### 3. Response Caching with ETag

**Location**: `/src/middleware/cacheMiddleware.js`

**Features**:
- Cache-Control headers
- ETag generation and validation
- Conditional requests (304 Not Modified)
- Route-based cache configuration

**Usage**:
```javascript
const { cacheMiddleware, noCache } = require('./middleware/cacheMiddleware');

// Enable caching with default config
app.use(cacheMiddleware({ etag: true }));

// Disable caching for specific routes
app.use('/api/admin', noCache());
```

**Cache Configuration**:
- `/api/v1/jobs` - 5 minutes, public
- `/api/v1/user` - 1 minute, private
- `/health` - No cache
- Static assets - 24 hours, immutable

**Benefits**:
- Reduced server load
- Faster repeat requests
- Bandwidth savings with 304 responses

### 4. Tiered Rate Limiting

**Location**: `/src/middleware/rateLimiter.js`

**Features**:
- Anonymous: 50 requests/15min
- Authenticated: 200 requests/15min
- Premium: 500 requests/15min
- Endpoint-specific limits
- Rate limit headers

**Usage**:
```javascript
const { apiLimiter, authLimiter, searchLimiter } = require('./middleware/rateLimiter');

// General API rate limiting
app.use('/api/', apiLimiter);

// Authentication endpoints
app.use('/auth/', authLimiter);

// Search endpoints
app.use('/api/v1/jobs/search', searchLimiter);
```

**Endpoint Limits**:
- Auth: 5 requests/15min (failed attempts only)
- Search: 30 requests/1min
- Chat: 20 requests/1min
- Upload: 10 requests/1hour

**Benefits**:
- Protection against abuse
- Fair resource allocation
- Better user experience for authenticated users

### 5. Performance Monitoring

**Location**: `/src/utils/performance.js`

**Features**:
- Request timing tracking
- Slow request logging
- Memory usage monitoring
- Performance budgets
- Prometheus metrics

**Usage**:
```javascript
const {
  requestTimingMiddleware,
  getPerformanceReport,
  checkPerformanceHealth
} = require('./utils/performance');

// Add timing middleware
app.use(requestTimingMiddleware);

// Get performance report
const report = getPerformanceReport();
console.log(report);

// Check health
const health = checkPerformanceHealth();
if (!health.healthy) {
  console.warn('Performance issues:', health.issues);
}
```

**Metrics Available**:
- Request duration histogram
- Slow request counter
- Memory usage gauge
- Database query metrics

**Benefits**:
- Real-time performance visibility
- Early issue detection
- Data-driven optimization

### 6. Frontend Optimizations

**Location**: `/frontend/plugins/optimization.js`

**Features**:
- Image lazy loading
- Component lazy loading
- Resource prefetching
- DNS prefetch
- Service worker caching
- Core Web Vitals monitoring

**Usage**:
```javascript
// Lazy load images
<img data-src="/path/to/image.jpg" alt="Description">

// Lazy load component
const HeavyComponent = lazyLoadComponent(() =>
  import('./components/HeavyComponent.vue')
);

// Prefetch next page
this.$addNavigationHints(['/next-page']);
```

**Benefits**:
- Faster initial page load
- Better Core Web Vitals scores
- Improved perceived performance
- Reduced bandwidth usage

## Performance Testing Guide

### 1. Load Testing

Use Apache Bench (ab) or Artillery:

```bash
# Test API endpoint
ab -n 1000 -c 10 http://localhost:3000/api/v1/jobs

# With authentication
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" \
   http://localhost:3000/api/v1/user/profile
```

### 2. Database Query Analysis

```javascript
const { analyzeQuery } = require('./utils/queryOptimizer');

// Analyze a query
const explanation = await analyzeQuery(`
  SELECT * FROM "Job"
  WHERE location = 'Remote'
  ORDER BY "postedDate" DESC
  LIMIT 20
`);

console.log(explanation);
```

### 3. Performance Monitoring

```bash
# Check performance endpoint
curl http://localhost:3000/api/performance

# Check Prometheus metrics
curl http://localhost:3000/metrics
```

### 4. Frontend Performance

Use Lighthouse:

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3001 --view
```

## Troubleshooting Slow Requests

### Step 1: Identify Slow Endpoints

```javascript
const { getSlowRequests } = require('./utils/performance');

// Get top 10 slowest requests
const slowRequests = getSlowRequests(10);
console.table(slowRequests);
```

### Step 2: Check Database Queries

```javascript
const { getQueryStats } = require('./utils/queryOptimizer');

// Check query performance
const stats = getQueryStats();
console.log('Cache hit rate:', stats.cacheHitRate);
console.log('Slow queries:', stats.slowQueriesCount);
console.log('Average time:', stats.averageTime);
```

### Step 3: Analyze Memory Usage

```javascript
const { getPerformanceReport } = require('./utils/performance');

const report = getPerformanceReport();
console.log('Memory usage:', {
  heapUsed: `${(report.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  heapTotal: `${(report.memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
  percentage: `${((report.memory.heapUsed / report.memory.heapTotal) * 100).toFixed(2)}%`
});
```

### Common Issues and Solutions

#### High Response Times

**Symptoms**:
- Average response time >500ms
- Many slow requests

**Solutions**:
1. Check database query performance
2. Enable/optimize caching
3. Review Prisma select statements (don't fetch unnecessary data)
4. Add database indexes

#### Memory Leaks

**Symptoms**:
- Memory usage continuously increasing
- Heap usage >80%

**Solutions**:
1. Check for unclosed database connections
2. Review cache size limits
3. Look for large objects in memory
4. Use Node.js heap snapshots

#### Cache Misses

**Symptoms**:
- Low cache hit rate (<50%)
- High database load

**Solutions**:
1. Increase cache TTL
2. Warm up cache on startup
3. Review cache invalidation strategy
4. Consider using Redis for distributed caching

#### Rate Limit Issues

**Symptoms**:
- Users hitting rate limits
- Legitimate traffic blocked

**Solutions**:
1. Review rate limit tiers
2. Adjust limits for specific endpoints
3. Implement user-based limits (not just IP)
4. Add rate limit warnings before blocking

## Performance Optimization Checklist

### Backend

- [ ] Database indexes on frequently queried fields
- [ ] Query result caching enabled
- [ ] Compression middleware configured
- [ ] Response caching with ETags
- [ ] Rate limiting implemented
- [ ] Performance monitoring active
- [ ] Slow query logging enabled
- [ ] Connection pooling optimized

### Frontend

- [ ] Image lazy loading implemented
- [ ] Component code splitting
- [ ] Critical CSS inlined
- [ ] Resources prefetched
- [ ] Service worker registered
- [ ] Core Web Vitals monitored
- [ ] Bundle size optimized

### Database

- [ ] Indexes on foreign keys
- [ ] Composite indexes where needed
- [ ] Connection pool size configured
- [ ] Query timeout set
- [ ] Regular VACUUM (PostgreSQL)
- [ ] Statistics updated

### Monitoring

- [ ] Prometheus metrics exposed
- [ ] Performance dashboard set up
- [ ] Alerts configured
- [ ] Log aggregation enabled
- [ ] APM tool integrated (optional)

## Additional Resources

- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Web Vitals](https://web.dev/vitals/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)

## Support

For performance-related issues:
1. Check performance metrics: `GET /api/performance`
2. Review slow query logs
3. Analyze Prometheus metrics: `GET /metrics`
4. Contact support with performance report
