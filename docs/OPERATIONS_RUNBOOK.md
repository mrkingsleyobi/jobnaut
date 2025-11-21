# Operations Runbook - JobNaut

## Table of Contents
1. [Daily Operational Tasks](#daily-operational-tasks)
2. [Weekly Maintenance Tasks](#weekly-maintenance-tasks)
3. [Monthly Reviews](#monthly-reviews)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Emergency Procedures](#emergency-procedures)
6. [On-Call Guide](#on-call-guide)

---

## Daily Operational Tasks

### Morning Health Check (9:00 AM)

**Priority: HIGH**

```bash
# 1. Check all services are running
./scripts/health-check.sh

# 2. Review overnight logs
docker-compose logs --tail=100 backend frontend

# 3. Check monitoring dashboards
# - Grafana: http://localhost:3001
# - Prometheus: http://localhost:9090
# - Check for any alerts

# 4. Verify database connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# 5. Check Redis status
redis-cli ping
redis-cli info stats

# 6. Verify Meilisearch health
curl http://localhost:7700/health
```

**Expected Results:**
- All health checks return 200 OK
- No critical errors in logs
- Database connections stable
- Redis responding to ping
- Meilisearch index updated

### Continuous Monitoring

**Every 2 Hours:**

```bash
# Check application metrics
curl http://localhost:3000/api/health | jq

# Monitor error rates
curl http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])

# Check disk space
df -h

# Monitor memory usage
free -h

# Check active connections
netstat -an | grep :3000 | wc -l
```

### End of Day Tasks (6:00 PM)

```bash
# 1. Review error logs
grep ERROR /var/log/jobnaut/*.log | tail -50

# 2. Check backup completion
ls -lh /backups/ | tail -5

# 3. Verify job scraping tasks completed
psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs WHERE created_at >= CURRENT_DATE;"

# 4. Review performance metrics
# - Response time averages
# - Database query performance
# - API endpoint usage

# 5. Update operations log
echo "$(date): Daily check completed" >> /var/log/ops-log.txt
```

---

## Weekly Maintenance Tasks

### Monday: System Review

**Priority: MEDIUM**

```bash
# 1. Review weekly performance trends
# Check Grafana dashboards for:
# - Average response times
# - Error rate trends
# - Resource utilization patterns

# 2. Analyze slow queries
psql $DATABASE_URL << EOF
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 20;
EOF

# 3. Check SSL certificate expiry
openssl s_client -connect jobnaut.com:443 -servername jobnaut.com 2>/dev/null | \
  openssl x509 -noout -dates

# 4. Review rate limiting metrics
redis-cli KEYS "rate_limit:*" | wc -l
```

### Tuesday: Database Maintenance

**Priority: HIGH**

```bash
# 1. Vacuum and analyze database
psql $DATABASE_URL << EOF
VACUUM ANALYZE;
SELECT schemaname, tablename, last_vacuum, last_autovacuum
FROM pg_stat_user_tables;
EOF

# 2. Check database size and growth
psql $DATABASE_URL << EOF
SELECT pg_size_pretty(pg_database_size('jobnaut')) as db_size;
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
EOF

# 3. Review and optimize indexes
psql $DATABASE_URL << EOF
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(indexrelid) DESC;
EOF

# 4. Check for table bloat
psql $DATABASE_URL -f /scripts/check-table-bloat.sql

# 5. Backup verification
./scripts/test-restore.sh --backup=latest --dry-run
```

### Wednesday: Security Review

**Priority: HIGH**

```bash
# 1. Review failed login attempts
psql $DATABASE_URL << EOF
SELECT COUNT(*), date_trunc('day', created_at)
FROM auth_logs
WHERE status = 'failed'
GROUP BY date_trunc('day', created_at)
ORDER BY date_trunc('day', created_at) DESC
LIMIT 7;
EOF

# 2. Check for suspicious API usage
grep "429" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# 3. Review Clerk webhook logs
cat /var/log/clerk-webhooks.log | grep ERROR

# 4. Scan for vulnerabilities
npm audit --production
cd frontend && npm audit --production

# 5. Review firewall rules
sudo iptables -L -n -v

# 6. Check for outdated dependencies
npm outdated
```

### Thursday: Performance Optimization

**Priority: MEDIUM**

```bash
# 1. Analyze API endpoint performance
# Review Prometheus metrics for:
# - p95 latency per endpoint
# - Request volume trends
# - Cache hit rates

# 2. Review Redis memory usage
redis-cli INFO memory

# 3. Check Meilisearch index performance
curl http://localhost:7700/indexes/jobs/stats | jq

# 4. Analyze CDN cache hit rates
# Review CDN provider dashboard

# 5. Review N+1 query issues
grep "Query" /var/log/jobnaut/backend.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

### Friday: Deployment Preparation

**Priority: MEDIUM**

```bash
# 1. Review pending updates
git fetch origin
git log HEAD..origin/main --oneline

# 2. Check staging environment
./scripts/health-check.sh --env=staging

# 3. Review test coverage
npm run test:coverage
cd frontend && npm run test:coverage

# 4. Plan next week's deployments
# - Review PR queue
# - Schedule maintenance windows
# - Prepare rollback plans

# 5. Update documentation
# - Check for outdated runbooks
# - Update changelog
# - Review API documentation
```

### Weekend: Automated Monitoring

**Automated Tasks:**

```bash
# Cron jobs running:
# 0 2 * * 6 - Full database backup
# 0 3 * * 0 - Database optimization
# 0 4 * * * - Log rotation
# */30 * * * * - Health checks
# 0 1 * * * - Job data scraping
```

**On-Call Duties:**
- Monitor alerts
- Respond to critical incidents
- Review automated task completions

---

## Monthly Reviews

### First Monday: Performance Review

**Attendees: DevOps Team, Engineering Lead**

**Agenda:**

1. **Performance Metrics (30 min)**
   - Review p50, p95, p99 latencies
   - Database performance trends
   - API endpoint usage patterns
   - Error rate analysis

2. **Capacity Planning (20 min)**
   - Current resource utilization
   - Projected growth
   - Scaling requirements
   - Budget impact

3. **Incident Review (20 min)**
   - Review all incidents
   - Root cause analysis
   - Preventive measures
   - Update runbooks

4. **Action Items (10 min)**
   - Assign optimization tasks
   - Schedule infrastructure upgrades
   - Plan load testing

**Deliverables:**
- Monthly performance report
- Capacity planning document
- Updated incident log
- Action item tracker

### Second Week: Security Audit

**Priority: HIGH**

```bash
# 1. Full security scan
npm audit --production
docker scan jobnaut/backend:latest
docker scan jobnaut/frontend:latest

# 2. Review access logs
psql $DATABASE_URL << EOF
SELECT username, COUNT(*) as login_count, MAX(created_at) as last_login
FROM auth_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY username
ORDER BY login_count DESC;
EOF

# 3. Check SSL/TLS configuration
nmap --script ssl-enum-ciphers -p 443 jobnaut.com

# 4. Review API key usage
# Check for unused or compromised keys

# 5. Update security documentation
# - Review and update security policies
# - Check compliance requirements
# - Update incident response plan
```

### Third Week: Cost Analysis

**Priority: MEDIUM**

```bash
# 1. Resource utilization report
# - Compute costs
# - Storage costs
# - Database costs
# - External API costs (Clerk, JSearch)
# - CDN costs

# 2. Identify optimization opportunities
# - Unused resources
# - Over-provisioned instances
# - Inefficient queries
# - Cache improvements

# 3. Budget forecast
# - Current monthly costs
# - Projected growth
# - Cost per user metrics
# - ROI analysis

# 4. Implement cost-saving measures
# - Reserved instances
# - Auto-scaling optimization
# - Data retention policies
# - API usage optimization
```

### Fourth Week: Disaster Recovery Test

**Priority: HIGH**

```bash
# 1. Full DR simulation
./scripts/dr-test.sh --full

# 2. Test backup restoration
./scripts/test-restore.sh --backup=production-latest

# 3. Verify failover procedures
# - Database failover
# - Application failover
# - DNS failover

# 4. Update DR documentation
# - RTO/RPO metrics
# - Recovery procedures
# - Contact information
# - Lessons learned

# 5. Team training
# - Conduct DR drill
# - Review procedures
# - Update on-call rotation
```

---

## Common Issues and Solutions

### Issue 1: High Response Times

**Symptoms:**
- API endpoints responding > 2 seconds
- User reports of slow page loads
- Grafana alerts for latency

**Quick Diagnosis:**

```bash
# Check database connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL << EOF
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
EOF

# Check Redis latency
redis-cli --latency

# Check system resources
top -b -n 1 | head -20
```

**Solutions:**

1. **Database Performance**
   ```bash
   # Kill long-running queries
   psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds';"

   # Rebuild indexes
   psql $DATABASE_URL -c "REINDEX DATABASE jobnaut;"
   ```

2. **Application Performance**
   ```bash
   # Restart application with fresh cache
   docker-compose restart backend
   redis-cli FLUSHDB
   ```

3. **Scale Resources**
   ```bash
   # Scale up application instances
   docker-compose up -d --scale backend=3
   ```

### Issue 2: Database Connection Pool Exhausted

**Symptoms:**
- "Too many connections" errors
- Application unable to query database
- 500 errors on all endpoints

**Quick Diagnosis:**

```bash
# Check active connections
psql $DATABASE_URL << EOF
SELECT COUNT(*), state FROM pg_stat_activity GROUP BY state;
SELECT pid, usename, application_name, client_addr, state, query
FROM pg_stat_activity WHERE state != 'idle';
EOF
```

**Solutions:**

1. **Immediate Fix**
   ```bash
   # Kill idle connections
   psql $DATABASE_URL << EOF
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < NOW() - INTERVAL '5 minutes';
   EOF
   ```

2. **Restart Application**
   ```bash
   docker-compose restart backend
   ```

3. **Long-term Fix**
   - Increase connection pool size in `.env`
   - Implement connection pooling with PgBouncer
   - Review and optimize database queries

### Issue 3: Meilisearch Index Out of Sync

**Symptoms:**
- Search results missing recent jobs
- Inconsistent search results
- Search returning 0 results

**Quick Diagnosis:**

```bash
# Check Meilisearch stats
curl http://localhost:7700/indexes/jobs/stats | jq

# Compare with database count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs;"
```

**Solutions:**

1. **Rebuild Index**
   ```bash
   # Stop indexing
   curl -X DELETE http://localhost:7700/indexes/jobs/tasks

   # Reindex all jobs
   npm run reindex:jobs
   ```

2. **Check Meilisearch Logs**
   ```bash
   docker-compose logs meilisearch | tail -100
   ```

### Issue 4: Redis Memory Full

**Symptoms:**
- Redis OOM errors
- Slow cache operations
- Application performance degradation

**Quick Diagnosis:**

```bash
# Check memory usage
redis-cli INFO memory

# Check key count
redis-cli DBSIZE
```

**Solutions:**

1. **Immediate Relief**
   ```bash
   # Flush old keys
   redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL
   ```

2. **Configure Eviction Policy**
   ```bash
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   redis-cli CONFIG SET maxmemory 2gb
   ```

### Issue 5: SSL Certificate Expired

**Symptoms:**
- Browser security warnings
- API requests failing with SSL errors
- Mobile app unable to connect

**Quick Diagnosis:**

```bash
# Check certificate expiry
openssl s_client -connect jobnaut.com:443 -servername jobnaut.com 2>/dev/null | openssl x509 -noout -dates
```

**Solutions:**

1. **Renew Certificate**
   ```bash
   # Using Let's Encrypt
   sudo certbot renew --force-renewal
   sudo systemctl reload nginx
   ```

2. **Update Docker Containers**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

## Emergency Procedures

### Critical System Failure

**Severity: P0 - Immediate Response Required**

**Step 1: Assess Impact (2 minutes)**

```bash
# Check all services
./scripts/health-check.sh

# Check error rates
curl http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[1m])

# Check logs
docker-compose logs --tail=50 backend frontend
```

**Step 2: Notify Stakeholders (5 minutes)**

```bash
# Update status page
curl -X POST https://status.jobnaut.com/api/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{"status": "investigating", "message": "Experiencing technical difficulties"}'

# Notify team
./scripts/alert-team.sh --severity=critical --message="System failure detected"
```

**Step 3: Execute Failover (10 minutes)**

```bash
# Switch to backup region
./scripts/failover.sh --region=us-west-2

# Verify failover
./scripts/health-check.sh --region=us-west-2
```

**Step 4: Root Cause Analysis**

- Collect all logs
- Review recent deployments
- Check monitoring dashboards
- Document timeline

**Step 5: Recovery and Communication**

```bash
# Restore service
./scripts/restore-primary.sh

# Update status page
curl -X POST https://status.jobnaut.com/api/incidents \
  -d '{"status": "resolved", "message": "Services restored"}'
```

### Database Corruption

**Severity: P1 - High Priority**

**Immediate Actions:**

```bash
# 1. Stop all writes
docker-compose stop backend

# 2. Assess damage
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database WHERE datname = 'jobnaut';"

# 3. Restore from backup
./scripts/restore-db.sh --backup=latest --verify

# 4. Verify data integrity
./scripts/verify-data.sh

# 5. Restart services
docker-compose start backend
```

### Security Breach

**Severity: P0 - Immediate Response Required**

**Immediate Actions:**

1. **Isolate Affected Systems**
   ```bash
   # Block all traffic except emergency access
   sudo iptables -A INPUT -j DROP
   sudo iptables -I INPUT -s <ADMIN_IP> -j ACCEPT
   ```

2. **Rotate All Credentials**
   ```bash
   # Rotate database passwords
   ./scripts/rotate-credentials.sh --type=database

   # Rotate API keys
   ./scripts/rotate-credentials.sh --type=api

   # Invalidate all sessions
   redis-cli FLUSHDB
   ```

3. **Collect Evidence**
   ```bash
   # Preserve logs
   tar -czf /secure/evidence-$(date +%Y%m%d-%H%M%S).tar.gz /var/log/

   # Capture network traffic
   tcpdump -i any -w /secure/traffic-$(date +%Y%m%d-%H%M%S).pcap
   ```

4. **Notify Authorities**
   - Contact security team
   - Notify affected users
   - File incident report
   - Contact legal team if required

---

## On-Call Guide

### On-Call Responsibilities

**Primary On-Call:**
- First responder to all alerts
- Initial incident triage
- Escalate if needed
- Document all actions

**Secondary On-Call:**
- Backup for primary
- Support during complex incidents
- Take over if primary unavailable

### Alert Severity Levels

**P0 - Critical (Response Time: 5 minutes)**
- Complete system outage
- Data breach
- Payment processing failure
- Security incident

**P1 - High (Response Time: 15 minutes)**
- Partial service disruption
- Database performance degradation
- Search functionality down
- Authentication issues

**P2 - Medium (Response Time: 1 hour)**
- Elevated error rates
- Slow response times
- Non-critical feature failure
- Monitoring gaps

**P3 - Low (Response Time: Next Business Day)**
- Minor bugs
- Documentation updates
- Enhancement requests
- Low-priority optimization

### Response Workflow

**1. Alert Received**
```bash
# Acknowledge alert
./scripts/ack-alert.sh --alert-id=$ALERT_ID

# Check runbook
cat /docs/runbooks/$ALERT_TYPE.md
```

**2. Initial Assessment**
```bash
# Quick health check
./scripts/health-check.sh --detailed

# Check recent changes
git log --since="2 hours ago" --oneline

# Review metrics
open http://grafana.jobnaut.com/d/overview
```

**3. Mitigation**
- Follow runbook procedures
- Document all actions in incident ticket
- Keep stakeholders updated

**4. Resolution**
- Verify fix
- Update monitoring
- Close incident ticket
- Schedule post-mortem

### On-Call Checklist

**Before Your Shift:**
- [ ] Verify access to all systems
- [ ] Test VPN connection
- [ ] Check laptop and phone battery
- [ ] Review recent incidents
- [ ] Read current system status

**During Your Shift:**
- [ ] Respond to alerts promptly
- [ ] Document all actions
- [ ] Escalate when needed
- [ ] Update incident tickets
- [ ] Communicate with team

**After Your Shift:**
- [ ] Hand off active incidents
- [ ] Update on-call log
- [ ] File post-mortem for major incidents
- [ ] Update runbooks with lessons learned

### Escalation Contacts

**Engineering:**
- Engineering Lead: +1-XXX-XXX-XXXX
- Database Admin: +1-XXX-XXX-XXXX
- Security Lead: +1-XXX-XXX-XXXX

**Management:**
- CTO: +1-XXX-XXX-XXXX
- VP Engineering: +1-XXX-XXX-XXXX

**External:**
- Clerk Support: support@clerk.dev
- Database Provider: [contact info]
- CDN Support: [contact info]

### Useful Commands

```bash
# Quick status check
./scripts/health-check.sh

# View active incidents
./scripts/list-incidents.sh --status=active

# Check recent deployments
git log --since="24 hours ago" --oneline

# Review error logs
docker-compose logs --tail=100 --follow | grep ERROR

# Database connection check
psql $DATABASE_URL -c "SELECT 1;"

# Redis check
redis-cli ping

# Application metrics
curl http://localhost:3000/api/metrics

# System resources
htop
df -h
free -h
```

---

## References

- [Monitoring Setup](MONITORING.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Disaster Recovery Plan](DISASTER_RECOVERY.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Security Hardening](SECURITY_HARDENING.md)

---

**Last Updated:** 2025-11-21
**Version:** 1.0
**Owner:** DevOps Team
