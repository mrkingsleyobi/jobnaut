# JobNaut Monitoring Infrastructure

This document describes the comprehensive monitoring and error tracking infrastructure for the JobNaut application.

## Table of Contents

- [Overview](#overview)
- [Components](#components)
- [Setup](#setup)
- [Sentry Error Tracking](#sentry-error-tracking)
- [Prometheus Metrics](#prometheus-metrics)
- [Grafana Dashboards](#grafana-dashboards)
- [Health Checks](#health-checks)
- [Logging](#logging)
- [Alerting](#alerting)
- [Best Practices](#best-practices)

## Overview

JobNaut's monitoring infrastructure provides:

- **Error Tracking**: Real-time error monitoring with Sentry
- **Metrics Collection**: Application and system metrics with Prometheus
- **Visualization**: Pre-built Grafana dashboards
- **Health Checks**: Kubernetes-compatible health endpoints
- **Structured Logging**: JSON-formatted logs with rotation
- **Alerting**: Alert management with Alertmanager

## Components

### 1. Sentry

Error tracking and performance monitoring for both backend and frontend.

**Features:**
- Real-time error tracking
- Performance monitoring
- Session replay
- User context tracking
- Release tracking

### 2. Prometheus

Metrics collection and time-series database.

**Metrics Collected:**
- HTTP request rate and duration
- Error rates
- Cache hit/miss ratios
- Database query performance
- AI service usage
- System metrics (CPU, memory, etc.)

### 3. Grafana

Visualization and dashboards for metrics.

**Dashboards:**
- JobNaut Overview Dashboard
- System Metrics Dashboard
- Custom dashboards can be added to `/home/user/jobnaut/monitoring/grafana/dashboards/`

### 4. Node Exporter

System-level metrics collection (CPU, memory, disk, network).

### 5. Alertmanager

Alert routing and management.

## Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Sentry account (optional, for error tracking)

### Basic Setup

1. **Configure Environment Variables**

   Copy and update the `.env.example` file:

   ```bash
   cp .env.example .env
   ```

   Update the following variables:

   ```env
   # Sentry Configuration (optional)
   SENTRY_DSN=your_sentry_dsn_here
   SENTRY_ENVIRONMENT=production

   # Logging
   LOG_LEVEL=info
   LOG_FORMAT=json

   # Monitoring
   PROMETHEUS_ENABLED=true

   # Grafana
   GRAFANA_ADMIN_USER=admin
   GRAFANA_ADMIN_PASSWORD=change_this_password
   ```

2. **Start Monitoring Stack**

   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

3. **Access Monitoring Services**

   - **Prometheus**: http://localhost:9090
   - **Grafana**: http://localhost:3002 (admin/admin)
   - **Alertmanager**: http://localhost:9093
   - **Node Exporter**: http://localhost:9100

4. **Start the Application**

   ```bash
   npm start
   ```

   The application will expose:
   - **Metrics**: http://localhost:3001/metrics
   - **Health Check**: http://localhost:3001/health
   - **Detailed Health**: http://localhost:3001/health/detailed

## Sentry Error Tracking

### Backend Configuration

The backend Sentry integration is configured in `/home/user/jobnaut/src/utils/sentry.js`.

**Features:**
- Automatic error capture
- Request tracing
- Performance monitoring
- User context tracking
- Sensitive data filtering

**Usage:**

```javascript
const { captureException, setUser, addBreadcrumb } = require('./utils/sentry');

// Capture an exception
try {
  // Your code
} catch (error) {
  captureException(error, {
    tags: { component: 'user-service' },
    extra: { userId: user.id }
  });
}

// Set user context
setUser({ id: user.id, email: user.email });

// Add breadcrumb
addBreadcrumb({
  message: 'User action',
  category: 'user',
  data: { action: 'login' }
});
```

### Frontend Configuration

The frontend Sentry integration is in `/home/user/jobnaut/frontend/plugins/sentry.js`.

**Features:**
- Error boundary integration
- Session replay
- Performance monitoring
- User feedback

**Configuration in Nuxt:**

Update `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      sentryDsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      sentryRelease: process.env.SENTRY_RELEASE
    }
  }
});
```

## Prometheus Metrics

### Available Metrics

#### HTTP Metrics
- `jobnaut_http_requests_total` - Total HTTP requests by method, route, status
- `jobnaut_http_request_duration_seconds` - HTTP request duration histogram
- `jobnaut_http_request_size_bytes` - HTTP request size histogram
- `jobnaut_http_response_size_bytes` - HTTP response size histogram
- `jobnaut_http_requests_in_progress` - Current in-flight requests

#### Cache Metrics
- `jobnaut_cache_hits_total` - Total cache hits by cache name
- `jobnaut_cache_misses_total` - Total cache misses by cache name

#### Database Metrics
- `jobnaut_db_query_duration_seconds` - Database query duration histogram
- `jobnaut_db_query_errors_total` - Total database query errors

#### AI Service Metrics
- `jobnaut_ai_requests_total` - Total AI service requests
- `jobnaut_ai_request_duration_seconds` - AI request duration histogram
- `jobnaut_ai_tokens_used_total` - Total AI tokens used

#### Error Metrics
- `jobnaut_errors_total` - Total errors by type and severity

#### System Metrics (via Node Exporter)
- CPU usage, memory usage, disk I/O, network I/O

### Custom Metrics

To track custom metrics:

```javascript
const { trackCache, trackDbQuery, trackAiRequest } = require('./middleware/metrics');

// Track cache operations
trackCache('user-cache', true); // hit
trackCache('user-cache', false); // miss

// Track database queries
const start = Date.now();
try {
  const result = await db.query(...);
  trackDbQuery('select', 'user', Date.now() - start);
} catch (error) {
  trackDbQuery('select', 'user', Date.now() - start, error);
}

// Track AI requests
trackAiRequest('openai', 'gpt-4', duration, 'success', { prompt: 100, completion: 50 });
```

## Grafana Dashboards

### Accessing Grafana

1. Navigate to http://localhost:3002
2. Login with credentials from `.env` (default: admin/admin)
3. Go to Dashboards > Browse
4. Open "JobNaut Overview Dashboard"

### Dashboard Panels

The pre-built dashboard includes:

1. **HTTP Request Rate** - Requests per second by route
2. **Response Time (p95)** - 95th percentile response time
3. **HTTP Status Codes** - Distribution of response codes
4. **Cache Hit Rate** - Cache effectiveness
5. **Memory Usage** - Application memory consumption
6. **Error Rate** - Errors per second by type

### Creating Custom Dashboards

1. In Grafana, click "+" > "Dashboard"
2. Add panels with PromQL queries
3. Save the dashboard JSON to `/home/user/jobnaut/monitoring/grafana/dashboards/`

## Health Checks

### Available Endpoints

#### Basic Health Check
```
GET /health
```

Returns simple OK status for load balancers.

#### Liveness Probe
```
GET /health/live
```

Indicates if the application is running (Kubernetes liveness probe).

#### Readiness Probe
```
GET /health/ready
```

Indicates if the application is ready to serve traffic (Kubernetes readiness probe).

Checks:
- Database connectivity
- Redis connectivity

#### Startup Probe
```
GET /health/startup
```

Indicates if the application has started successfully.

#### Detailed Health Check
```
GET /health/detailed
```

Returns comprehensive health information:
- Overall status
- Database status
- Redis status
- External services status
- System information

### Kubernetes Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health/startup
    port: 3001
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30
```

## Logging

### Configuration

Logging is configured in `/home/user/jobnaut/src/utils/logger.js`.

**Features:**
- JSON-formatted logs for production
- Colored console logs for development
- Automatic log rotation (14 days, 10MB files)
- Separate files for errors, warnings, and exceptions
- Structured logging with metadata

### Log Levels

- **error**: Error messages
- **warn**: Warning messages
- **info**: Informational messages
- **debug**: Debug messages (development only)

### Environment Variables

```env
LOG_LEVEL=info          # Minimum log level
LOG_FORMAT=json         # Log format (json or simple)
LOG_MAX_FILES=14        # Maximum log files to keep
LOG_MAX_SIZE=10485760   # Maximum log file size (10MB)
```

### Log Files

- `/logs/combined.log` - All logs
- `/logs/error.log` - Error level logs
- `/logs/warn.log` - Warning level logs
- `/logs/exceptions.log` - Uncaught exceptions
- `/logs/rejections.log` - Unhandled promise rejections

### Helper Methods

```javascript
const logger = require('./utils/logger');

// Log HTTP request
logger.logRequest(req, res, duration);

// Log database query
logger.logQuery('select', 'user', duration, error);

// Log AI request
logger.logAI('openai', 'gpt-4', duration, tokens, error);
```

### Log Aggregation with Loki

To aggregate logs with Grafana Loki:

1. Install Promtail (log shipper)
2. Configure Promtail to read from `/logs/*.log`
3. Add Loki as a data source in Grafana
4. Create log dashboards

## Alerting

### Alertmanager Configuration

Alertmanager is configured in `/home/user/jobnaut/monitoring/alertmanager/config.yml`.

### Alert Channels

Configure notification channels:

1. **Email**: Update SMTP settings in `config.yml`
2. **Slack**: Add webhook URL for Slack notifications
3. **PagerDuty**: Add service key for incident management

### Alert Rules

Create alert rules in `/home/user/jobnaut/monitoring/prometheus/alerts/`:

```yaml
groups:
  - name: jobnaut_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(jobnaut_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"
```

## Best Practices

### Error Tracking

1. **Add Context**: Always include relevant context with errors
2. **Set User Context**: Track user information for better debugging
3. **Use Breadcrumbs**: Add breadcrumbs for complex workflows
4. **Filter Sensitive Data**: Never log passwords, tokens, or PII

### Metrics

1. **Use Labels Wisely**: Don't create too many label combinations
2. **Monitor SLIs**: Track Service Level Indicators (latency, errors, throughput)
3. **Set Up Alerts**: Create alerts for critical metrics
4. **Regular Review**: Review dashboards weekly

### Logging

1. **Structured Logging**: Always use structured logging with JSON
2. **Appropriate Levels**: Use correct log levels (error, warn, info, debug)
3. **No Sensitive Data**: Never log sensitive information
4. **Performance**: Be mindful of logging performance impact

### Health Checks

1. **Quick Checks**: Health checks should complete in < 1 second
2. **Dependency Checks**: Include critical dependencies in readiness probes
3. **Timeout Handling**: Handle timeouts gracefully
4. **Meaningful Status**: Return meaningful status information

## Troubleshooting

### Prometheus Not Scraping

1. Check if metrics endpoint is accessible:
   ```bash
   curl http://localhost:3001/metrics
   ```

2. Verify Prometheus targets:
   - Navigate to http://localhost:9090/targets
   - Check target status

3. Check Prometheus logs:
   ```bash
   docker-compose -f docker-compose.monitoring.yml logs prometheus
   ```

### Grafana Dashboard Not Loading

1. Verify Prometheus data source:
   - Go to Configuration > Data Sources
   - Test the Prometheus connection

2. Check dashboard JSON syntax:
   - Validate JSON in dashboard files

3. Restart Grafana:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart grafana
   ```

### Sentry Not Receiving Events

1. Verify DSN configuration in `.env`
2. Check Sentry initialization in logs
3. Test error capture:
   ```javascript
   const { captureException } = require('./utils/sentry');
   captureException(new Error('Test error'));
   ```

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Node Exporter](https://github.com/prometheus/node_exporter)

## Support

For questions or issues with monitoring:

1. Check this documentation
2. Review application logs
3. Check monitoring service logs
4. Contact the DevOps team
