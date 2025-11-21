# Troubleshooting Guide - JobNaut

## Table of Contents
1. [Common Error Scenarios](#common-error-scenarios)
2. [Debug Techniques](#debug-techniques)
3. [Log Analysis](#log-analysis)
4. [Performance Issues](#performance-issues)
5. [Database Issues](#database-issues)
6. [Network Issues](#network-issues)
7. [Quick Reference Commands](#quick-reference-commands)

---

## Common Error Scenarios

### 1. Application Won't Start

**Symptom:**
```
Error: Cannot find module '@prisma/client'
or
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**

```bash
# Check if all dependencies are installed
npm list @prisma/client

# Check if database is running
psql $DATABASE_URL -c "SELECT 1;"

# Check environment variables
env | grep DATABASE_URL
env | grep CLERK_
env | grep REDIS_URL
```

**Solutions:**

```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Regenerate Prisma client
npx prisma generate

# 3. Check database connection
# Verify DATABASE_URL in .env
# Ensure PostgreSQL is running
docker-compose up -d postgres

# 4. Run database migrations
npx prisma migrate deploy

# 5. Verify all services running
docker-compose ps
```

---

### 2. 500 Internal Server Error

**Symptom:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

**Diagnosis:**

```bash
# Check recent error logs
docker-compose logs --tail=50 backend | grep ERROR

# Check application logs
cat /var/log/jobnaut/backend.log | grep ERROR | tail -20

# Check for uncaught exceptions
grep "Uncaught Exception" /var/log/jobnaut/backend.log
```

**Common Causes:**

1. **Database Connection Issues**
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT NOW();"

   # Check connection pool
   psql $DATABASE_URL << EOF
   SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'jobnaut';
   SELECT state, COUNT(*) FROM pg_stat_activity GROUP BY state;
   EOF
   ```

2. **Missing Environment Variables**
   ```bash
   # Verify all required env vars
   node -e "
   const required = ['DATABASE_URL', 'CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'REDIS_URL'];
   required.forEach(key => {
     if (!process.env[key]) console.error('Missing:', key);
   });
   "
   ```

3. **Prisma Client Issues**
   ```bash
   # Regenerate Prisma client
   npx prisma generate

   # Restart application
   docker-compose restart backend
   ```

---

### 3. Authentication Failures

**Symptom:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session"
}
```

**Diagnosis:**

```bash
# Check Clerk configuration
echo "Clerk Publishable Key: ${CLERK_PUBLISHABLE_KEY:0:20}..."
echo "Clerk Secret Key: ${CLERK_SECRET_KEY:0:20}..."

# Check session in Redis
redis-cli GET "session:user_123"

# Check auth logs
psql $DATABASE_URL << EOF
SELECT * FROM auth_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
EOF
```

**Solutions:**

1. **Clear Browser Cookies**
   - Go to browser DevTools > Application > Cookies
   - Delete all cookies for your domain

2. **Verify Clerk Webhook**
   ```bash
   # Check webhook configuration in Clerk Dashboard
   # Ensure webhook URL is correct: https://yourdomain.com/api/webhooks/clerk

   # Test webhook locally
   curl -X POST http://localhost:3000/api/webhooks/clerk \
     -H "Content-Type: application/json" \
     -H "svix-id: test" \
     -H "svix-timestamp: $(date +%s)" \
     -H "svix-signature: test" \
     -d '{"type":"user.created","data":{"id":"test"}}'
   ```

3. **Check Session Expiry**
   ```typescript
   // Verify session timeout in code
   // src/middleware/auth.ts
   const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
   ```

---

### 4. Slow API Response Times

**Symptom:**
- API endpoints taking > 2 seconds
- Timeout errors
- Users reporting slow page loads

**Diagnosis:**

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/jobs

# Create curl-format.txt
cat > curl-format.txt << EOF
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# Check for slow database queries
psql $DATABASE_URL << EOF
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF

# Check Redis latency
redis-cli --latency

# Check system resources
top -b -n 1 | head -20
free -h
df -h
```

**Solutions:**

1. **Database Optimization**
   ```bash
   # Add missing indexes
   psql $DATABASE_URL << EOF
   -- Analyze table statistics
   ANALYZE jobs;
   ANALYZE users;
   ANALYZE applications;

   -- Check for missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public' AND tablename = 'jobs'
   ORDER BY abs(correlation) DESC;
   EOF
   ```

2. **Enable Query Caching**
   ```typescript
   // src/lib/cache.ts
   import { redis } from './redis'

   export async function cachedQuery<T>(
     key: string,
     ttl: number,
     queryFn: () => Promise<T>
   ): Promise<T> {
     const cached = await redis.get(key)
     if (cached) return JSON.parse(cached)

     const result = await queryFn()
     await redis.setex(key, ttl, JSON.stringify(result))
     return result
   }
   ```

3. **Scale Application Instances**
   ```bash
   # Scale up backend
   docker-compose up -d --scale backend=3

   # Verify load distribution
   for i in {1..10}; do
     curl -s http://localhost:3000/api/health | jq -r '.hostname'
   done
   ```

---

### 5. Search Not Returning Results

**Symptom:**
- Search returns 0 results
- Search results outdated
- Meilisearch errors

**Diagnosis:**

```bash
# Check Meilisearch status
curl http://localhost:7700/health

# Check index stats
curl http://localhost:7700/indexes/jobs/stats | jq

# Compare with database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs WHERE active = true;"

# Check last indexing time
redis-cli GET "meilisearch:last_index"
```

**Solutions:**

1. **Rebuild Search Index**
   ```bash
   # Delete existing index
   curl -X DELETE http://localhost:7700/indexes/jobs

   # Recreate and reindex
   npm run reindex:jobs
   ```

2. **Check Index Settings**
   ```bash
   # View current settings
   curl http://localhost:7700/indexes/jobs/settings | jq

   # Update searchable attributes
   curl -X PATCH http://localhost:7700/indexes/jobs/settings \
     -H 'Content-Type: application/json' \
     -d '{
       "searchableAttributes": ["title", "description", "location", "company"],
       "filterableAttributes": ["location", "salary_min", "remote", "active"],
       "sortableAttributes": ["created_at", "salary_max"]
     }'
   ```

3. **Monitor Indexing Job**
   ```bash
   # Check indexing task status
   curl http://localhost:7700/tasks | jq '.results[] | select(.type == "documentAdditionOrUpdate")'
   ```

---

### 6. Redis Connection Issues

**Symptom:**
```
Error: Redis connection refused
or
Error: READONLY You can't write against a read only replica
```

**Diagnosis:**

```bash
# Test Redis connection
redis-cli ping

# Check Redis info
redis-cli INFO replication

# Check connection count
redis-cli INFO clients | grep connected_clients

# Check memory usage
redis-cli INFO memory | grep used_memory_human
```

**Solutions:**

1. **Restart Redis**
   ```bash
   docker-compose restart redis

   # Or system service
   sudo systemctl restart redis
   ```

2. **Clear Redis Data**
   ```bash
   redis-cli FLUSHDB

   # Or selective cleanup
   redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL
   ```

3. **Check Redis Configuration**
   ```bash
   # Verify maxmemory
   redis-cli CONFIG GET maxmemory

   # Set if needed
   redis-cli CONFIG SET maxmemory 2gb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

---

## Debug Techniques

### Enable Debug Logging

**Backend:**

```typescript
// src/index.ts
import { logger } from './utils/logger'

// Set log level
logger.level = process.env.LOG_LEVEL || 'debug'

// Add request logging
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    headers: req.headers
  })
  next()
})

// Add response logging
app.use((req, res, next) => {
  const originalSend = res.send
  res.send = function(data) {
    logger.debug('Outgoing response', {
      statusCode: res.statusCode,
      data: typeof data === 'string' ? data.substring(0, 200) : data
    })
    return originalSend.call(this, data)
  }
  next()
})
```

**Frontend:**

```typescript
// frontend/plugins/debug.ts
export default defineNuxtPlugin(() => {
  if (process.env.NODE_ENV === 'development') {
    // Log all API calls
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      console.log('API Call:', args[0])
      return originalFetch.apply(this, args).then(response => {
        console.log('API Response:', response.status, args[0])
        return response
      })
    }
  }
})
```

### Use Node.js Inspector

```bash
# Start backend with inspector
node --inspect=0.0.0.0:9229 dist/index.js

# Or with Docker
docker-compose -f docker-compose.debug.yml up

# Connect Chrome DevTools
# Open: chrome://inspect
# Click "inspect" on your application
```

### Database Query Logging

```typescript
// src/lib/db.ts
export const dbWrite = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ]
})

dbWrite.$on('query', (e) => {
  logger.debug('Database query', {
    query: e.query,
    params: e.params,
    duration: e.duration
  })
})
```

### Network Traffic Analysis

```bash
# Capture HTTP traffic
tcpdump -i any -w capture.pcap port 3000

# Analyze with Wireshark
wireshark capture.pcap

# Or use httpry
httpry -i eth0 -o http-traffic.txt

# Monitor real-time requests
ngrep -q -W byline "^(GET|POST) " tcp port 3000
```

---

## Log Analysis

### Application Logs

**View Recent Errors:**

```bash
# Last 100 errors
docker-compose logs backend | grep ERROR | tail -100

# Errors in last hour
docker-compose logs --since 1h backend | grep ERROR

# Specific error pattern
docker-compose logs backend | grep "Database.*Error"

# Count errors by type
docker-compose logs backend | grep ERROR | \
  awk '{print $5}' | sort | uniq -c | sort -rn
```

### Access Logs

**Nginx Access Log Analysis:**

```bash
# Top 10 accessed endpoints
awk '{print $7}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -10

# Requests by status code
awk '{print $9}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn

# Top IPs by request count
awk '{print $1}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -20

# Average response time
awk '{sum+=$10; count++} END {print sum/count}' /var/log/nginx/access.log

# Slow requests (> 1 second)
awk '$10 > 1.0 {print $7, $10}' /var/log/nginx/access.log | sort -k2 -rn
```

### Database Logs

**PostgreSQL Log Analysis:**

```bash
# Find slow queries
grep "duration:" /var/log/postgresql/postgresql.log | \
  awk '{print $13, $0}' | sort -rn | head -20

# Connection errors
grep "connection" /var/log/postgresql/postgresql.log | grep -i error

# Deadlocks
grep "deadlock" /var/log/postgresql/postgresql.log

# Failed authentication
grep "authentication failed" /var/log/postgresql/postgresql.log
```

### Centralized Logging

**Setup Loki + Grafana:**

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  loki-data:
  grafana-data:
```

**Query Logs in Grafana:**

```logql
# All errors in last hour
{job="backend"} |= "ERROR" [1h]

# Slow queries
{job="postgres"} |~ "duration: [0-9]{4,}" [1h]

# Authentication failures
{job="backend"} |= "authentication failed" [1h]

# Rate limiting
{job="nginx"} |= "429" [1h]
```

---

## Performance Issues

### High CPU Usage

**Diagnosis:**

```bash
# Check process CPU usage
top -b -n 1 | head -20

# Find CPU-intensive processes
ps aux --sort=-%cpu | head -10

# Profile Node.js application
node --prof dist/index.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

**Solutions:**

1. **Identify Hot Code Paths**
   ```bash
   # Use clinic.js
   npm install -g clinic

   # Generate flame graph
   clinic flame -- node dist/index.js

   # Open in browser
   clinic flame --open
   ```

2. **Optimize Algorithms**
   ```typescript
   // Example: Optimize N+1 queries

   // ❌ Bad: N+1 query
   const jobs = await prisma.job.findMany()
   for (const job of jobs) {
     job.company = await prisma.company.findUnique({
       where: { id: job.companyId }
     })
   }

   // ✅ Good: Single query with join
   const jobs = await prisma.job.findMany({
     include: { company: true }
   })
   ```

3. **Enable Clustering**
   ```typescript
   // src/cluster.ts
   import cluster from 'cluster'
   import os from 'os'

   if (cluster.isPrimary) {
     const numCPUs = os.cpus().length
     console.log(`Master process ${process.pid} starting ${numCPUs} workers`)

     for (let i = 0; i < numCPUs; i++) {
       cluster.fork()
     }

     cluster.on('exit', (worker) => {
       console.log(`Worker ${worker.process.pid} died, starting new worker`)
       cluster.fork()
     })
   } else {
     require('./index')
   }
   ```

### High Memory Usage

**Diagnosis:**

```bash
# Check memory usage
free -h

# Process memory usage
ps aux --sort=-%mem | head -10

# Node.js heap snapshot
node --expose-gc --inspect dist/index.js

# Take heap snapshot in Chrome DevTools
# Memory > Take heap snapshot
```

**Solutions:**

1. **Identify Memory Leaks**
   ```bash
   # Use memlab
   npm install -g memlab

   # Run leak detection
   memlab run --scenario ./test-scenario.js
   ```

2. **Optimize Memory Usage**
   ```typescript
   // Use streams for large data
   import { pipeline } from 'stream/promises'

   app.get('/api/export/jobs', async (req, res) => {
     const stream = await prisma.$queryRawUnsafe(
       'SELECT * FROM jobs'
     )

     res.setHeader('Content-Type', 'application/json')
     await pipeline(
       stream,
       JSONStream.stringify(),
       res
     )
   })
   ```

3. **Configure Node.js Heap**
   ```bash
   # Increase max heap size
   node --max-old-space-size=4096 dist/index.js

   # Or in package.json
   "scripts": {
     "start": "node --max-old-space-size=4096 dist/index.js"
   }
   ```

---

## Database Issues

### Database Lock Contention

**Symptom:**
```
Error: could not obtain lock on row in relation "jobs"
```

**Diagnosis:**

```sql
-- Check for blocked queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Solutions:**

```sql
-- Kill blocking query
SELECT pg_terminate_backend(blocking_pid);

-- Reduce lock timeout
ALTER DATABASE jobnaut SET lock_timeout = '10s';

-- Use row-level locking more efficiently
BEGIN;
SELECT * FROM jobs WHERE id = 123 FOR UPDATE SKIP LOCKED;
-- Update
COMMIT;
```

### Connection Pool Exhausted

**Diagnosis:**

```sql
-- Check active connections
SELECT
  COUNT(*) FILTER (WHERE state = 'active') as active,
  COUNT(*) FILTER (WHERE state = 'idle') as idle,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  COUNT(*) as total
FROM pg_stat_activity
WHERE datname = 'jobnaut';
```

**Solutions:**

```typescript
// Increase pool size in Prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 20
}

// Implement connection pooling with PgBouncer
// See SCALING_GUIDE.md for configuration
```

---

## Network Issues

### Intermittent Connectivity

**Diagnosis:**

```bash
# Test connectivity
ping jobnaut.com

# Check DNS resolution
nslookup jobnaut.com
dig jobnaut.com

# Trace route
traceroute jobnaut.com

# Check firewall rules
sudo iptables -L -n -v

# Monitor network traffic
nethogs
```

**Solutions:**

```bash
# Flush DNS cache
sudo systemd-resolve --flush-caches

# Reset network interface
sudo ip link set eth0 down
sudo ip link set eth0 up

# Check MTU size
ip link show eth0

# Adjust if needed
sudo ip link set eth0 mtu 1500
```

---

## Quick Reference Commands

### Health Checks

```bash
# All services
./scripts/health-check.sh

# Database
psql $DATABASE_URL -c "SELECT 1;"

# Redis
redis-cli ping

# Meilisearch
curl http://localhost:7700/health

# Backend API
curl http://localhost:3000/api/health
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend

# With rebuild
docker-compose up -d --build backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2023-01-01T00:00:00 backend
```

### Database Maintenance

```bash
# Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Rebuild indexes
psql $DATABASE_URL -c "REINDEX DATABASE jobnaut;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('jobnaut'));"
```

### Cache Management

```bash
# Clear all cache
redis-cli FLUSHALL

# Clear specific pattern
redis-cli --scan --pattern "cache:jobs:*" | xargs redis-cli DEL

# Check cache hit rate
redis-cli INFO stats | grep keyspace
```

---

## Getting Help

**Internal Resources:**
- [Operations Runbook](OPERATIONS_RUNBOOK.md)
- [Monitoring Dashboard](http://grafana.jobnaut.com)
- [API Documentation](API_REFERENCE.md)

**External Resources:**
- Clerk Support: https://clerk.dev/support
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Redis Docs: https://redis.io/docs/
- Meilisearch Docs: https://docs.meilisearch.com/

**Emergency Contacts:**
- On-Call Engineer: [See OPERATIONS_RUNBOOK.md]
- Engineering Lead: [contact]
- DevOps Team: [contact]

---

**Last Updated:** 2025-11-21
**Version:** 1.0
**Owner:** Engineering Team
