# JobNaut Monitoring Stack

This directory contains the configuration for the JobNaut monitoring infrastructure.

## Quick Start

### Start Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Stop Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml down
```

### View Logs

```bash
docker-compose -f docker-compose.monitoring.yml logs -f
```

## Services

### Prometheus (Port 9090)

Metrics collection and time-series database.

- **URL**: http://localhost:9090
- **Config**: `prometheus/prometheus.yml`
- **Data**: Stored in Docker volume `prometheus-data`

**Common Tasks:**

```bash
# View all metrics
curl http://localhost:9090/api/v1/label/__name__/values

# Query metric
curl 'http://localhost:9090/api/v1/query?query=jobnaut_http_requests_total'

# Reload configuration
curl -X POST http://localhost:9090/-/reload
```

### Grafana (Port 3002)

Visualization and dashboards.

- **URL**: http://localhost:3002
- **Default Login**: admin/admin (change in `.env`)
- **Dashboards**: `grafana/dashboards/`
- **Provisioning**: `grafana/provisioning/`

**Common Tasks:**

```bash
# Reset admin password
docker exec -it jobnaut-grafana grafana-cli admin reset-admin-password newpassword

# List installed plugins
docker exec -it jobnaut-grafana grafana-cli plugins ls

# Install plugin
docker exec -it jobnaut-grafana grafana-cli plugins install <plugin-name>
```

### Node Exporter (Port 9100)

System metrics collector.

- **URL**: http://localhost:9100
- **Metrics**: http://localhost:9100/metrics

Collects: CPU, memory, disk, network metrics

### Alertmanager (Port 9093)

Alert routing and management.

- **URL**: http://localhost:9093
- **Config**: `alertmanager/config.yml`

**Common Tasks:**

```bash
# Test alert
curl -XPOST http://localhost:9093/api/v1/alerts -d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "critical"
  },
  "annotations": {
    "description": "This is a test alert"
  }
}]'

# Silence alert
curl -XPOST http://localhost:9093/api/v1/silences -d '{
  "matchers": [{"name": "alertname", "value": "TestAlert"}],
  "startsAt": "2024-01-01T00:00:00Z",
  "endsAt": "2024-01-01T01:00:00Z",
  "createdBy": "admin",
  "comment": "Test silence"
}'
```

## Directory Structure

```
monitoring/
├── README.md                          # This file
├── prometheus/
│   ├── prometheus.yml                 # Prometheus configuration
│   └── alerts/                        # Alert rules (optional)
├── grafana/
│   ├── dashboards/                    # Dashboard JSON files
│   │   └── jobnaut-overview.json     # Main dashboard
│   └── provisioning/                  # Auto-provisioning configs
│       ├── datasources/               # Data source configs
│       │   └── prometheus.yml
│       └── dashboards/                # Dashboard provisioning
│           └── dashboards.yml
└── alertmanager/
    └── config.yml                     # Alertmanager configuration
```

## Configuration

### Adding Prometheus Scrape Targets

Edit `prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-service'
    static_configs:
      - targets: ['my-service:8080']
        labels:
          service: 'my-service'
```

Then reload Prometheus:

```bash
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Adding Grafana Dashboards

1. Create dashboard in Grafana UI
2. Export dashboard JSON (Dashboard Settings > JSON Model)
3. Save to `grafana/dashboards/my-dashboard.json`
4. Restart Grafana or wait for auto-reload

### Configuring Alerts

#### Step 1: Create Alert Rules

Create `prometheus/alerts/rules.yml`:

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
          summary: "High error rate"
          description: "Error rate is {{ $value }}"
```

#### Step 2: Update Prometheus Config

Add to `prometheus/prometheus.yml`:

```yaml
rule_files:
  - "alerts/*.yml"
```

#### Step 3: Configure Notification Channels

Edit `alertmanager/config.yml` to add:

- Email (SMTP)
- Slack webhooks
- PagerDuty
- Webhook endpoints

## Monitoring the Application

### Application Endpoints

- **Metrics**: http://localhost:3001/metrics
- **Health**: http://localhost:3001/health
- **Detailed Health**: http://localhost:3001/health/detailed
- **Readiness**: http://localhost:3001/health/ready
- **Liveness**: http://localhost:3001/health/live

### Sample Queries

#### HTTP Metrics

```promql
# Request rate
rate(jobnaut_http_requests_total[5m])

# Error rate
rate(jobnaut_http_requests_total{status_code=~"5.."}[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(jobnaut_http_request_duration_seconds_bucket[5m]))

# Requests by status code
sum by (status_code) (rate(jobnaut_http_requests_total[5m]))
```

#### Cache Metrics

```promql
# Cache hit rate
rate(jobnaut_cache_hits_total[5m]) / (rate(jobnaut_cache_hits_total[5m]) + rate(jobnaut_cache_misses_total[5m])) * 100
```

#### System Metrics

```promql
# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Disk usage
100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})
```

## Data Retention

### Prometheus

Data retention is set to 30 days in `docker-compose.monitoring.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=30d'
```

To change retention:

1. Edit `docker-compose.monitoring.yml`
2. Restart Prometheus

### Grafana

Grafana stores dashboards in Docker volume `grafana-data`.

To backup:

```bash
docker run --rm -v jobnaut_grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /data
```

To restore:

```bash
docker run --rm -v jobnaut_grafana-data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /
```

## Troubleshooting

### Prometheus Not Starting

```bash
# Check logs
docker-compose -f docker-compose.monitoring.yml logs prometheus

# Validate configuration
docker run --rm -v $(pwd)/monitoring/prometheus:/etc/prometheus prom/prometheus:latest promtool check config /etc/prometheus/prometheus.yml
```

### Grafana Not Loading Dashboards

```bash
# Check provisioning logs
docker-compose -f docker-compose.monitoring.yml logs grafana | grep provisioning

# Verify dashboard JSON
cat grafana/dashboards/jobnaut-overview.json | jq .
```

### High Memory Usage

Prometheus can consume significant memory with many metrics.

To reduce memory usage:

1. Decrease retention time
2. Reduce scrape frequency
3. Drop unnecessary metrics using relabel configs

## Production Deployment

### Security

1. **Change Default Passwords**
   - Update Grafana admin password
   - Secure Prometheus with authentication

2. **Use HTTPS**
   - Configure reverse proxy (nginx, Traefik)
   - Enable TLS for all services

3. **Network Isolation**
   - Use Docker networks
   - Restrict access to monitoring ports

### Scaling

1. **Prometheus Federation**
   - Set up multiple Prometheus servers
   - Aggregate with federation

2. **Grafana HA**
   - Use external database (PostgreSQL)
   - Run multiple Grafana instances

3. **Remote Storage**
   - Configure remote write to Thanos/Cortex
   - Enable long-term storage

### Backup Strategy

1. **Automated Backups**
   ```bash
   # Backup Prometheus data
   docker run --rm -v jobnaut_prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-$(date +%Y%m%d).tar.gz /data

   # Backup Grafana data
   docker run --rm -v jobnaut_grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-$(date +%Y%m%d).tar.gz /data
   ```

2. **Schedule with Cron**
   ```bash
   0 2 * * * /path/to/backup-script.sh
   ```

## Additional Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)

## Support

For issues or questions:

1. Check logs: `docker-compose -f docker-compose.monitoring.yml logs`
2. Review documentation: `/home/user/jobnaut/docs/MONITORING.md`
3. Contact DevOps team
