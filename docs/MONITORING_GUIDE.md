# JobNaut Monitoring Guide

Comprehensive guide for monitoring JobNaut application using Prometheus, Grafana, and Alertmanager.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Accessing Dashboards](#accessing-dashboards)
- [Understanding Metrics](#understanding-metrics)
- [Alert Management](#alert-management)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Best Practices](#best-practices)

## Overview

JobNaut uses a comprehensive monitoring stack:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Alertmanager** - Alert routing and notifications
- **Node Exporter** - System-level metrics

### Architecture

```
Application → Prometheus → Grafana (Visualization)
                ↓
           Alertmanager → Notifications (Slack/Email/PagerDuty)
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Verify Service Health

Check that all services are accessible:

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)
- Alertmanager: http://localhost:9093
- Node Exporter: http://localhost:9100/metrics

### 3. Import Dashboards

Dashboards are automatically provisioned from `/monitoring/grafana/dashboards/`:

- **Application Metrics** - Request rates, response times, error tracking
- **Business Metrics** - User activity, feature usage
- **Infrastructure Metrics** - CPU, memory, disk, network

## Accessing Dashboards

### Grafana Login

1. Navigate to http://localhost:3002
2. Default credentials: `admin` / `admin`
3. Change password on first login

### Available Dashboards

#### 1. Application Metrics Dashboard

**URL**: http://localhost:3002/d/jobnaut-application

**Panels**:
- Request rate by endpoint
- Total request rate (gauge)
- Response time percentiles (p50, p95, p99)
- Error rate by status code (4xx, 5xx)
- Active requests
- Database query performance (p95)
- Cache hit ratio
- Cache hit/miss by cache name

**Use Cases**:
- Monitor API performance
- Identify slow endpoints
- Track error rates
- Optimize cache performance

#### 2. Business Metrics Dashboard

**URL**: http://localhost:3002/d/jobnaut-business

**Panels**:
- Active users (current)
- User registrations (24h)
- Job searches (24h)
- Saved jobs (24h)
- User registrations over time
- Job searches over time
- Chat messages over time
- Skill gap analyses over time
- Top 10 search keywords (pie chart)
- Feature usage

**Use Cases**:
- Track user engagement
- Understand feature adoption
- Identify popular search terms
- Monitor business KPIs

#### 3. Infrastructure Metrics Dashboard

**URL**: http://localhost:3002/d/jobnaut-infrastructure

**Panels**:
- CPU usage (gauge)
- Memory usage (gauge)
- Disk usage (gauge)
- CPU usage over time
- Memory usage over time
- Disk I/O
- Network traffic
- Service health status
- Application memory usage

**Use Cases**:
- Monitor system resources
- Identify resource bottlenecks
- Track service health
- Plan capacity

## Understanding Metrics

### Metric Types

#### Counters
Always increasing values (resets on restart):
- `jobnaut_http_requests_total` - Total HTTP requests
- `jobnaut_user_registrations_total` - User registrations
- `jobnaut_job_searches_total` - Job searches

#### Gauges
Can increase or decrease:
- `jobnaut_active_users` - Currently active users
- `jobnaut_http_requests_in_progress` - Active requests
- `jobnaut_active_sessions` - Active sessions

#### Histograms
Distribution of values:
- `jobnaut_http_request_duration_seconds` - Response time distribution
- `jobnaut_db_query_duration_seconds` - Database query duration

### Key Metrics

#### Performance Metrics

```promql
# Request rate (requests per second)
rate(jobnaut_http_requests_total[5m])

# P95 response time
histogram_quantile(0.95, rate(jobnaut_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(jobnaut_http_requests_total{status_code=~"5.."}[5m])
```

#### Business Metrics

```promql
# User registrations in last 24 hours
increase(jobnaut_user_registrations_total[24h])

# Job searches per minute
rate(jobnaut_job_searches_total[1m]) * 60

# Cache hit ratio
sum(rate(jobnaut_cache_hits_total[5m])) /
(sum(rate(jobnaut_cache_hits_total[5m])) + sum(rate(jobnaut_cache_misses_total[5m])))
```

#### Infrastructure Metrics

```promql
# CPU usage percentage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage percentage
100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100)
```

## Alert Management

### Alert Severity Levels

- **Critical** - Immediate action required (PagerDuty + Slack + Email)
- **Warning** - Issue needs attention (Slack notification)
- **Info** - Informational only (logged)

### Active Alerts

View active alerts:
- Prometheus: http://localhost:9090/alerts
- Alertmanager: http://localhost:9093/#/alerts

### Alert Rules

Located in `/monitoring/prometheus/alerts.yml`

#### Performance Alerts

| Alert | Threshold | Duration | Severity |
|-------|-----------|----------|----------|
| HighErrorRate | >1% 5xx errors | 2 minutes | Critical |
| SlowResponseTime | P95 >500ms | 5 minutes | Warning |
| VerySlowResponseTime | P95 >2s | 3 minutes | Critical |
| HighClientErrorRate | >10% 4xx errors | 5 minutes | Warning |

#### Cache Alerts

| Alert | Threshold | Duration | Severity |
|-------|-----------|----------|----------|
| LowCacheHitRate | <80% | 10 minutes | Warning |
| CriticalCacheHitRate | <50% | 5 minutes | Critical |

#### Database Alerts

| Alert | Threshold | Duration | Severity |
|-------|-----------|----------|----------|
| SlowDatabaseQueries | P95 >1s | 5 minutes | Warning |
| DatabaseErrors | >0.1 errors/sec | 3 minutes | Critical |

#### Infrastructure Alerts

| Alert | Threshold | Duration | Severity |
|-------|-----------|----------|----------|
| HighMemoryUsage | >85% | 5 minutes | Warning |
| CriticalMemoryUsage | >95% | 2 minutes | Critical |
| HighCPUUsage | >80% | 10 minutes | Warning |
| CriticalCPUUsage | >95% | 3 minutes | Critical |
| HighDiskUsage | >85% | 5 minutes | Warning |
| CriticalDiskUsage | >95% | 2 minutes | Critical |

#### Service Health Alerts

| Alert | Threshold | Duration | Severity |
|-------|-----------|----------|----------|
| ServiceDown | Service unavailable | 1 minute | Critical |
| HealthCheckFailing | Health endpoint errors | 2 minutes | Critical |
| ContainerRestarts | >0.1 restarts/15m | 5 minutes | Warning |

### Notification Channels

Configure in `/monitoring/alertmanager/config.yml`:

#### Slack Integration

```yaml
slack_configs:
  - api_url: '${SLACK_WEBHOOK_URL}'
    channel: '#alerts-critical'
```

**Environment variable**: Set `SLACK_WEBHOOK_URL` in `.env`

#### Email Integration

```yaml
email_configs:
  - to: '${ALERT_EMAIL_TO}'
    from: '${ALERT_EMAIL_FROM}'
    smarthost: '${SMTP_SMARTHOST}'
```

**Environment variables**: Set in `.env`:
- `ALERT_EMAIL_TO`
- `ALERT_EMAIL_FROM`
- `SMTP_SMARTHOST`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`

#### PagerDuty Integration

```yaml
pagerduty_configs:
  - service_key: '${PAGERDUTY_SERVICE_KEY}'
```

**Environment variable**: Set `PAGERDUTY_SERVICE_KEY` in `.env`

### Silencing Alerts

Temporarily silence alerts during maintenance:

1. Go to http://localhost:9093
2. Click "New Silence"
3. Set matchers (e.g., `alertname=HighCPUUsage`)
4. Set duration
5. Add comment explaining reason

## Troubleshooting Guide

### Common Issues

#### 1. High Error Rate (5xx)

**Symptoms**:
- HighErrorRate alert firing
- Dashboard shows >1% error rate

**Investigation**:
1. Check application logs:
   ```bash
   docker logs jobnaut-api --tail 100
   ```
2. View error breakdown by endpoint in Grafana
3. Check database connection status
4. Review recent deployments

**Solutions**:
- Restart application if needed
- Check database connectivity
- Review error logs for stack traces
- Rollback if caused by recent deployment

#### 2. Slow Response Time

**Symptoms**:
- SlowResponseTime or VerySlowResponseTime alert
- Dashboard shows high P95 latency

**Investigation**:
1. Identify slow endpoint in dashboard
2. Check database query performance
3. Review cache hit ratio
4. Check system resource usage (CPU, memory)

**Solutions**:
- Optimize slow database queries
- Add caching for frequently accessed data
- Scale up resources if needed
- Review N+1 query patterns

#### 3. Low Cache Hit Rate

**Symptoms**:
- LowCacheHitRate alert firing
- Cache hit ratio <80%

**Investigation**:
1. Check cache size and eviction policy
2. Review cache TTL settings
3. Identify cache keys with high miss rate

**Solutions**:
- Increase cache memory allocation
- Adjust TTL for frequently accessed data
- Pre-warm cache for common queries
- Review cache key patterns

#### 4. High Memory Usage

**Symptoms**:
- HighMemoryUsage or CriticalMemoryUsage alert
- Memory gauge >85%

**Investigation**:
1. Check application memory in dashboard
2. Review memory leaks
3. Check for memory-intensive operations

**Solutions**:
- Restart application (temporary)
- Optimize memory-heavy operations
- Increase available memory
- Implement pagination for large datasets

#### 5. Service Down

**Symptoms**:
- ServiceDown alert firing
- Health check returning errors

**Investigation**:
1. Check service status:
   ```bash
   docker-compose ps
   ```
2. View service logs:
   ```bash
   docker logs jobnaut-api
   ```
3. Check resource availability

**Solutions**:
- Restart service:
   ```bash
   docker-compose restart jobnaut-api
   ```
- Check dependencies (database, Redis)
- Review startup errors in logs

#### 6. Database Connection Issues

**Symptoms**:
- DatabaseErrors alert firing
- Connection pool exhaustion

**Investigation**:
1. Check database connection count
2. Review slow queries
3. Check database resource usage

**Solutions**:
- Increase connection pool size
- Optimize long-running queries
- Implement query timeouts
- Add query result pagination

### Query Examples for Investigation

#### Find slowest endpoints:
```promql
topk(10,
  histogram_quantile(0.95,
    rate(jobnaut_http_request_duration_seconds_bucket[5m])
  )
)
```

#### Error rate by endpoint:
```promql
sum by (route) (
  rate(jobnaut_http_requests_total{status_code=~"5.."}[5m])
) /
sum by (route) (
  rate(jobnaut_http_requests_total[5m])
)
```

#### Database queries by operation:
```promql
sum by (operation) (
  rate(jobnaut_db_query_duration_seconds_sum[5m])
) /
sum by (operation) (
  rate(jobnaut_db_query_duration_seconds_count[5m])
)
```

## Best Practices

### 1. Regular Monitoring

- Check dashboards daily
- Review alerts weekly
- Analyze trends monthly
- Set up automated reports

### 2. Alert Configuration

- Avoid alert fatigue - tune thresholds
- Use appropriate severity levels
- Document alert response procedures
- Test notification channels regularly

### 3. Dashboard Usage

- Create team-specific dashboards
- Use time range filters effectively
- Set up dashboard annotations for deployments
- Share dashboard links in documentation

### 4. Performance Optimization

- Monitor P95/P99 latencies, not just averages
- Track business metrics alongside technical metrics
- Set performance budgets
- Review slow queries regularly

### 5. Capacity Planning

- Monitor resource trends over time
- Set up proactive alerts (70-80% thresholds)
- Plan for traffic spikes
- Review historical data for scaling decisions

### 6. Incident Response

- Document common issues and solutions
- Create runbooks for alerts
- Set up on-call rotation
- Conduct post-incident reviews

### 7. Metric Instrumentation

- Add business-relevant metrics
- Use consistent naming conventions
- Document custom metrics
- Regularly review and prune unused metrics

## Integrating Metrics in Application Code

### Tracking Business Events

```javascript
const {
  trackUserRegistration,
  trackJobSearch,
  trackSavedJob,
  trackChatMessage,
  trackSkillGapAnalysis,
  trackFeatureUsage
} = require('./middleware/metrics');

// Track user registration
app.post('/api/users/register', async (req, res) => {
  // ... registration logic
  trackUserRegistration();
  // ...
});

// Track job search with keyword
app.get('/api/jobs/search', async (req, res) => {
  const { keyword } = req.query;
  trackJobSearch(keyword);
  // ... search logic
});

// Track saved job
app.post('/api/jobs/:id/save', async (req, res) => {
  // ... save logic
  trackSavedJob();
  // ...
});

// Track feature usage
app.post('/api/skill-gap/analyze', async (req, res) => {
  trackFeatureUsage('skill-gap-analysis');
  trackSkillGapAnalysis();
  // ... analysis logic
});
```

### Tracking Active Sessions

```javascript
const {
  incrementActiveSessions,
  decrementActiveSessions,
  setActiveUsers
} = require('./middleware/metrics');

// On user login
app.post('/api/auth/login', async (req, res) => {
  // ... login logic
  incrementActiveSessions();
  // ...
});

// On user logout
app.post('/api/auth/logout', async (req, res) => {
  // ... logout logic
  decrementActiveSessions();
  // ...
});

// Periodic update of active users
setInterval(async () => {
  const activeUserCount = await getActiveUserCount();
  setActiveUsers(activeUserCount);
}, 60000); // Every minute
```

## Maintenance

### Backup and Retention

**Prometheus data retention**: 30 days (configurable in docker-compose.monitoring.yml)

**Grafana dashboards**: Backed up in `/monitoring/grafana/dashboards/`

### Updating Dashboards

1. Edit dashboard in Grafana UI
2. Export dashboard JSON
3. Save to `/monitoring/grafana/dashboards/`
4. Commit to version control

### Updating Alert Rules

1. Edit `/monitoring/prometheus/alerts.yml`
2. Reload Prometheus configuration:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```
3. Verify rules loaded:
   http://localhost:9090/rules

### Updating Alertmanager Configuration

1. Edit `/monitoring/alertmanager/config.yml`
2. Reload Alertmanager:
   ```bash
   curl -X POST http://localhost:9093/-/reload
   ```
3. Verify configuration:
   http://localhost:9093/#/status

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

## Support

For monitoring-related issues:

1. Check this guide first
2. Review logs: `docker-compose -f docker-compose.monitoring.yml logs`
3. Consult team documentation
4. Escalate to DevOps team

---

**Last Updated**: 2025-11-21
**Version**: 1.0.0
