# Disaster Recovery Plan - JobNaut

## Table of Contents
1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Procedures](#recovery-procedures)
5. [Failover Strategies](#failover-strategies)
6. [Data Recovery Steps](#data-recovery-steps)
7. [Communication Plan](#communication-plan)
8. [Testing DR Plan](#testing-dr-plan)
9. [RTO and RPO Definitions](#rto-and-rpo-definitions)

---

## Overview

This Disaster Recovery (DR) plan outlines procedures for recovering JobNaut services in the event of catastrophic failure, natural disaster, cyberattack, or other significant disruptions.

**Purpose:** Ensure business continuity and minimize data loss during disaster scenarios.

**Scope:** All critical systems including:
- Application servers (Backend, Frontend)
- Databases (PostgreSQL)
- Cache layers (Redis)
- Search services (Meilisearch)
- Authentication services (Clerk)
- Monitoring and logging infrastructure

**Owner:** DevOps Team
**Review Frequency:** Quarterly
**Last Review:** 2025-11-21
**Next Review:** 2026-02-21

---

## Recovery Objectives

### Recovery Time Objective (RTO)

**RTO**: Maximum acceptable downtime before severe business impact

| Service | RTO Target | Priority | Impact if Exceeded |
|---------|-----------|----------|-------------------|
| Authentication (Clerk) | 15 minutes | P0 - Critical | Users cannot login, complete service outage |
| Backend API | 30 minutes | P0 - Critical | No job searches, applications, or data access |
| Database | 1 hour | P0 - Critical | Data unavailable, business operations halted |
| Frontend | 1 hour | P1 - High | Users cannot access platform |
| Search (Meilisearch) | 2 hours | P1 - High | Degraded search functionality |
| Redis Cache | 4 hours | P2 - Medium | Slower performance, higher database load |
| Monitoring | 8 hours | P3 - Low | Blind to system issues |

### Recovery Point Objective (RPO)

**RPO**: Maximum acceptable data loss measured in time

| Data Type | RPO Target | Backup Frequency | Impact if Exceeded |
|-----------|-----------|------------------|-------------------|
| User accounts | 0 minutes | Real-time (Clerk) | User data loss, trust impact |
| Job applications | 15 minutes | Continuous replication | Lost applications, user complaints |
| Job listings | 1 hour | Hourly incremental | Stale job data, poor UX |
| User profiles | 1 hour | Hourly incremental | Profile updates lost |
| Analytics data | 24 hours | Daily full backup | Historical data gap |
| Logs | 24 hours | Daily full backup | Limited incident forensics |

### Business Impact

**Financial Impact:**
- Revenue loss: ~$1,000/hour of downtime
- SLA penalties: Variable based on contract
- Recovery costs: $5,000-$50,000 depending on scenario

**Reputation Impact:**
- User trust degradation
- Negative reviews and social media
- Competitive disadvantage

**Regulatory Impact:**
- GDPR data breach notification (72 hours)
- Potential fines for data loss
- Compliance audits

---

## Disaster Scenarios

### Scenario 1: Complete Data Center Failure

**Probability:** Low (0.1% annually)
**Impact:** Critical
**Cause:** Natural disaster, power outage, network failure

**Indicators:**
- All services in primary region unreachable
- Health checks failing across all systems
- No response from monitoring infrastructure
- Cloud provider status page shows outage

**Response:** Execute full regional failover (Section 4.1)

---

### Scenario 2: Database Corruption or Failure

**Probability:** Medium (2% annually)
**Impact:** Critical
**Cause:** Hardware failure, software bug, human error

**Indicators:**
- Database connection errors
- Data inconsistencies detected
- PostgreSQL crash logs
- Failed transaction errors

**Response:** Execute database recovery (Section 4.2)

---

### Scenario 3: Ransomware Attack

**Probability:** Medium (5% annually)
**Impact:** Critical
**Cause:** Malware, phishing, compromised credentials

**Indicators:**
- Encrypted files detected
- Ransom note displayed
- Unusual file modifications
- Antivirus alerts

**Response:** Execute security incident response (Section 4.3)

---

### Scenario 4: Application Server Failure

**Probability:** High (10% annually)
**Impact:** High
**Cause:** Software bugs, resource exhaustion, deployment issues

**Indicators:**
- 500 errors on all endpoints
- Container crashes
- Out of memory errors
- Application logs show crashes

**Response:** Execute application recovery (Section 4.4)

---

### Scenario 5: Accidental Data Deletion

**Probability:** Medium (3% annually)
**Impact:** Medium-High
**Cause:** Human error, buggy script, malicious insider

**Indicators:**
- Reports of missing data
- Unexpected drop in record counts
- Audit logs show bulk deletions
- User complaints

**Response:** Execute data restoration (Section 4.5)

---

## Recovery Procedures

### 4.1 Complete Regional Failover

**Prerequisites:**
- Secondary region configured and synchronized
- DNS failover configured
- Backup region tested monthly

**Execution Time:** 30-60 minutes

**Step 1: Verify Primary Region Failure (5 minutes)**

```bash
#!/bin/bash
# scripts/verify-region-failure.sh

echo "Checking primary region health..."

# Check application health
PRIMARY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.jobnaut.com/health)

if [ "$PRIMARY_HEALTH" != "200" ]; then
  echo "❌ Primary region API unreachable"
else
  echo "✅ Primary region API responding"
  exit 0
fi

# Check database
if ! psql $PRIMARY_DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1; then
  echo "❌ Primary database unreachable"
else
  echo "✅ Primary database responding"
  exit 0
fi

# Check multiple endpoints
ENDPOINTS=(
  "https://jobnaut.com"
  "https://api.jobnaut.com/health"
  "https://api.jobnaut.com/api/jobs"
)

FAILED=0
for endpoint in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
  if [ "$STATUS" != "200" ]; then
    echo "❌ $endpoint unreachable (HTTP $STATUS)"
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -ge 2 ]; then
  echo "⚠️  PRIMARY REGION FAILURE CONFIRMED"
  exit 1
fi
```

**Step 2: Activate Incident Response Team (5 minutes)**

```bash
# Notify team
./scripts/alert-team.sh \
  --severity=critical \
  --message="PRIMARY REGION FAILURE - Initiating failover" \
  --incident-id="DR-$(date +%Y%m%d-%H%M%S)"

# Update status page
curl -X POST https://api.statuspage.io/v1/incidents \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d '{
    "incident": {
      "name": "Service Disruption - Planned Failover",
      "status": "investigating",
      "impact_override": "critical",
      "body": "We are experiencing issues with our primary region and are failing over to our backup region."
    }
  }'
```

**Step 3: Promote Secondary Database (10 minutes)**

```bash
#!/bin/bash
# scripts/promote-secondary-db.sh

echo "Promoting secondary database to primary..."

# Stop replication
psql $SECONDARY_DATABASE_URL << EOF
SELECT pg_promote();
EOF

# Wait for promotion
echo "Waiting for promotion to complete..."
sleep 10

# Verify database is writable
psql $SECONDARY_DATABASE_URL << EOF
CREATE TABLE dr_test (id int);
DROP TABLE dr_test;
EOF

if [ $? -eq 0 ]; then
  echo "✅ Secondary database promoted successfully"
else
  echo "❌ Failed to promote secondary database"
  exit 1
fi

# Update connection strings
export DATABASE_URL=$SECONDARY_DATABASE_URL
echo "DATABASE_URL=$SECONDARY_DATABASE_URL" >> .env.failover
```

**Step 4: Switch DNS to Secondary Region (10 minutes)**

```bash
#!/bin/bash
# scripts/failover-dns.sh

# Using AWS Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "jobnaut.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [
            {"Value": "'$SECONDARY_REGION_IP'"}
          ]
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.jobnaut.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [
            {"Value": "'$SECONDARY_REGION_API_IP'"}
          ]
        }
      }
    ]
  }'

echo "DNS updated. Waiting for propagation..."
sleep 60

# Verify DNS change
nslookup jobnaut.com
```

**Step 5: Start Services in Secondary Region (15 minutes)**

```bash
#!/bin/bash
# scripts/start-secondary-services.sh

# Set environment to secondary region
export AWS_REGION=us-west-2
export KUBECONFIG=~/.kube/config-secondary

# Scale up services
kubectl scale deployment jobnaut-backend --replicas=4
kubectl scale deployment jobnaut-frontend --replicas=3

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=jobnaut-backend --timeout=300s
kubectl wait --for=condition=ready pod -l app=jobnaut-frontend --timeout=300s

# Start Redis cluster
docker-compose -f docker-compose.secondary.yml up -d redis

# Start Meilisearch
docker-compose -f docker-compose.secondary.yml up -d meilisearch

# Verify all services
./scripts/health-check.sh --region=secondary

echo "✅ All services started in secondary region"
```

**Step 6: Verify Application Functionality (10 minutes)**

```bash
#!/bin/bash
# scripts/verify-failover.sh

echo "Running post-failover verification..."

# Test authentication
curl -X POST https://api.jobnaut.com/api/auth/verify \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json"

# Test job search
curl -X GET "https://api.jobnaut.com/api/jobs?query=engineer&location=remote"

# Test database writes
curl -X POST https://api.jobnaut.com/api/test/write \
  -H "Content-Type: application/json" \
  -d '{"test": "failover"}'

# Run smoke tests
npm run test:smoke -- --region=secondary

if [ $? -eq 0 ]; then
  echo "✅ Failover successful - All systems operational"
else
  echo "❌ Failover verification failed"
  exit 1
fi
```

**Step 7: Update Status and Monitor (5 minutes)**

```bash
# Update status page
curl -X PATCH https://api.statuspage.io/v1/incidents/$INCIDENT_ID \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d '{
    "incident": {
      "status": "monitoring",
      "body": "Services have been restored in our backup region. We are monitoring stability."
    }
  }'

# Set up enhanced monitoring
./scripts/enable-enhanced-monitoring.sh --region=secondary

# Notify team of successful failover
./scripts/notify-team.sh \
  --message="Failover complete. All services operational in secondary region."
```

---

### 4.2 Database Recovery

**Scenario:** Database corruption, failure, or data loss

**Step 1: Assess Database State (5 minutes)**

```bash
#!/bin/bash
# scripts/assess-db-state.sh

echo "Assessing database state..."

# Check if database is accessible
if psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database is accessible"

  # Check for corruption
  psql $DATABASE_URL << EOF
  SELECT datname, pg_database_size(datname)
  FROM pg_database
  WHERE datname = 'jobnaut';

  -- Check table integrity
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
else
  echo "❌ Database is not accessible"
  echo "Proceeding with full restore from backup"
  exit 1
fi
```

**Step 2: Stop All Write Operations (2 minutes)**

```bash
# Put application in read-only mode
kubectl set env deployment/jobnaut-backend READ_ONLY_MODE=true

# Or stop backend completely
kubectl scale deployment jobnaut-backend --replicas=0

# Revoke write access from application user
psql $DATABASE_URL << EOF
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM jobnaut_app;
EOF
```

**Step 3: Create Emergency Backup (10 minutes)**

```bash
#!/bin/bash
# Even if database is corrupted, try to backup current state
BACKUP_FILE="/backups/emergency-$(date +%Y%m%d-%H%M%S).sql"

pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_FILE \
  --verbose

echo "Emergency backup saved to $BACKUP_FILE"
```

**Step 4: Restore from Latest Good Backup (30 minutes)**

```bash
#!/bin/bash
# scripts/restore-database.sh

# Find latest backup
LATEST_BACKUP=$(ls -t /backups/*.sql | head -1)
echo "Restoring from: $LATEST_BACKUP"

# Drop existing database (if accessible)
psql postgres << EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'jobnaut' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS jobnaut;
CREATE DATABASE jobnaut;
EOF

# Restore backup
pg_restore \
  --dbname=$DATABASE_URL \
  --jobs=4 \
  --verbose \
  $LATEST_BACKUP

if [ $? -eq 0 ]; then
  echo "✅ Database restored successfully"
else
  echo "❌ Database restore failed"
  exit 1
fi

# Verify data integrity
psql $DATABASE_URL << EOF
-- Check record counts
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'applications', COUNT(*) FROM applications;

-- Check data consistency
SELECT COUNT(*) as orphaned_applications
FROM applications a
LEFT JOIN users u ON a.user_id = u.id
WHERE u.id IS NULL;
EOF
```

**Step 5: Apply Transaction Logs (if available) (15 minutes)**

```bash
#!/bin/bash
# Replay WAL logs from backup time to failure time

# Find WAL files
WAL_DIR="/backups/wal"
START_TIME=$(stat -c %Y $LATEST_BACKUP)
END_TIME=$(date +%s)

# Restore WAL files
for wal_file in $(find $WAL_DIR -type f -newer $LATEST_BACKUP); do
  echo "Applying WAL: $wal_file"
  pg_waldump $wal_file | psql $DATABASE_URL
done

echo "✅ Transaction logs applied"
```

**Step 6: Verify and Re-enable Write Access (5 minutes)**

```bash
# Run data integrity checks
npm run db:verify

# Test write operations
psql $DATABASE_URL << EOF
BEGIN;
CREATE TABLE dr_write_test (id int);
INSERT INTO dr_write_test VALUES (1);
SELECT * FROM dr_write_test;
DROP TABLE dr_write_test;
COMMIT;
EOF

# Re-enable write access
psql $DATABASE_URL << EOF
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jobnaut_app;
EOF

# Remove read-only mode
kubectl set env deployment/jobnaut-backend READ_ONLY_MODE-

# Scale backend back up
kubectl scale deployment jobnaut-backend --replicas=4

echo "✅ Database recovery complete"
```

---

### 4.3 Ransomware Response

**CRITICAL: Do NOT pay ransom without consulting legal and executive team**

**Step 1: Immediate Isolation (5 minutes)**

```bash
#!/bin/bash
# scripts/isolate-infected-systems.sh

echo "⚠️  RANSOMWARE DETECTED - ISOLATING SYSTEMS"

# Block all network traffic
sudo iptables -P INPUT DROP
sudo iptables -P OUTPUT DROP
sudo iptables -P FORWARD DROP

# Except SSH from admin IP
sudo iptables -A INPUT -s $ADMIN_IP -p tcp --dport 22 -j ACCEPT
sudo iptables -A OUTPUT -d $ADMIN_IP -p tcp --sport 22 -j ACCEPT

# Disconnect from network
# ip link set eth0 down

# Kill suspicious processes
pkill -9 -f "suspicious_process_name"

echo "✅ System isolated"
```

**Step 2: Preserve Evidence (10 minutes)**

```bash
#!/bin/bash
# scripts/preserve-evidence.sh

EVIDENCE_DIR="/secure/evidence-$(date +%Y%m%d-%H%M%S)"
mkdir -p $EVIDENCE_DIR

# Capture memory dump
sudo dd if=/dev/mem of=$EVIDENCE_DIR/memory.dump bs=1M

# Copy all logs
cp -r /var/log/* $EVIDENCE_DIR/logs/

# List all files with recent modifications
find / -type f -mtime -1 > $EVIDENCE_DIR/modified_files.txt

# Capture network connections
netstat -anp > $EVIDENCE_DIR/network_connections.txt

# Process list
ps auxf > $EVIDENCE_DIR/processes.txt

# Create hash of all files
find / -type f -exec sha256sum {} \; > $EVIDENCE_DIR/file_hashes.txt

echo "Evidence preserved in $EVIDENCE_DIR"
```

**Step 3: Notify Authorities and Stakeholders (15 minutes)**

```bash
# Notify incident response team
./scripts/alert-team.sh --severity=critical --message="RANSOMWARE ATTACK"

# Notify legal team
# Notify executive team
# File report with FBI/cybercrime division
# Notify cyber insurance provider

# Update status page
curl -X POST https://api.statuspage.io/v1/incidents \
  -d '{
    "incident": {
      "name": "Security Incident",
      "status": "investigating",
      "impact_override": "critical",
      "body": "We are investigating a security incident. Services are temporarily offline."
    }
  }'
```

**Step 4: Assess Impact (30 minutes)**

```bash
#!/bin/bash
# Identify encrypted files
find / -type f -name "*.encrypted" -o -name "*.locked" -o -name "*.crypto"

# Check for ransom notes
find / -type f -name "RANSOM*" -o -name "README*" -o -name "DECRYPT*"

# Determine ransomware variant
# Analyze file extensions, ransom note content
# Check online databases (ID Ransomware, No More Ransom)
```

**Step 5: Restore from Clean Backup (2-4 hours)**

```bash
#!/bin/bash
# scripts/restore-from-clean-backup.sh

# Verify backup integrity
./scripts/verify-backup-integrity.sh

# Build new infrastructure from scratch
./scripts/provision-clean-environment.sh

# Restore data from backup taken BEFORE infection
CLEAN_BACKUP="/backups/verified-clean/backup-$(date -d '7 days ago' +%Y%m%d).sql"

# Restore to new environment
./scripts/restore-database.sh --backup=$CLEAN_BACKUP --target=new-environment

# Verify no malware in backup
./scripts/scan-for-malware.sh --target=new-environment

# Migrate users to new environment
./scripts/cutover-to-new-environment.sh
```

**Step 6: Security Hardening (ongoing)**

```bash
# Change all passwords and credentials
./scripts/rotate-all-credentials.sh --force

# Update all systems
apt-get update && apt-get upgrade -y

# Install additional security tools
apt-get install -y clamav rkhunter fail2ban

# Enable additional logging
./scripts/enable-audit-logging.sh

# Implement additional access controls
./scripts/harden-security.sh
```

---

### 4.4 Application Server Failure

**Step 1: Verify Failure Scope (2 minutes)**

```bash
# Check if single instance or all instances
kubectl get pods -l app=jobnaut-backend

# Check logs for crash reason
kubectl logs -l app=jobnaut-backend --tail=100

# Check resource usage
kubectl top pods -l app=jobnaut-backend
```

**Step 2: Quick Recovery Attempt (5 minutes)**

```bash
# Restart failed pods
kubectl delete pod -l app=jobnaut-backend

# Wait for new pods
kubectl wait --for=condition=ready pod -l app=jobnaut-backend --timeout=120s

# Verify health
curl https://api.jobnaut.com/health
```

**Step 3: Rollback if Recent Deployment (10 minutes)**

```bash
# Check recent deployments
kubectl rollout history deployment/jobnaut-backend

# Rollback to previous version
kubectl rollout undo deployment/jobnaut-backend

# Monitor rollback
kubectl rollout status deployment/jobnaut-backend
```

**Step 4: Scale Horizontally (5 minutes)**

```bash
# Scale up to compensate for failures
kubectl scale deployment jobnaut-backend --replicas=8

# Verify health of new instances
kubectl get pods -l app=jobnaut-backend
```

---

### 4.5 Data Restoration

**Step 1: Identify Deleted Data (5 minutes)**

```bash
# Check audit logs
psql $DATABASE_URL << EOF
SELECT * FROM audit_logs
WHERE action = 'DELETE'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
EOF

# Identify affected tables and record counts
```

**Step 2: Restore from Point-in-Time (20 minutes)**

```bash
#!/bin/bash
# scripts/point-in-time-restore.sh

# Create new database for restoration
psql postgres << EOF
CREATE DATABASE jobnaut_recovery;
EOF

# Restore to point before deletion
pg_restore \
  --dbname=jobnaut_recovery \
  --recovery-target-time="2025-11-21 10:00:00" \
  /backups/latest.sql

# Extract deleted data
psql jobnaut_recovery << EOF
\copy (SELECT * FROM jobs WHERE id IN (1,2,3)) TO '/tmp/recovered_jobs.csv' CSV HEADER;
EOF

# Import to production
psql $DATABASE_URL << EOF
\copy jobs FROM '/tmp/recovered_jobs.csv' CSV HEADER;
EOF
```

---

## Failover Strategies

### Active-Passive Failover

**Architecture:**
- Primary region: Active, handles all traffic
- Secondary region: Passive, synchronized but not serving traffic
- Manual or automatic failover based on health checks

**Advantages:**
- Cost-effective (secondary region minimal compute)
- Simple to understand and maintain

**Disadvantages:**
- Longer RTO (15-30 minutes to start services)
- Manual intervention often required

### Active-Active Failover

**Architecture:**
- Multiple regions active simultaneously
- Load balanced across all regions
- Automatic failover via DNS or load balancer

**Advantages:**
- Near-zero RTO (traffic automatically routed)
- Better performance (users routed to nearest region)

**Disadvantages:**
- Higher cost (full capacity in multiple regions)
- Complex data synchronization

### Pilot Light

**Architecture:**
- Minimal services running in secondary region
- Quick scale-up when needed
- Database replicated continuously

**Advantages:**
- Lower cost than active-active
- Faster than cold standby

**Disadvantages:**
- Some manual steps required
- 10-30 minute RTO

---

## Data Recovery Steps

### Backup Strategy

**Full Backups:**
- Frequency: Daily at 2 AM UTC
- Retention: 30 days
- Location: S3 with versioning enabled
- Encryption: AES-256

**Incremental Backups:**
- Frequency: Hourly
- Retention: 7 days
- Location: S3 separate bucket

**Continuous Replication:**
- Database: PostgreSQL streaming replication
- Redis: AOF persistence + RDB snapshots
- Application files: S3 versioning

### Backup Verification

```bash
#!/bin/bash
# scripts/verify-backups.sh

# Run daily
LATEST_BACKUP=$(ls -t /backups/*.sql | head -1)

# Test restore to temporary database
createdb backup_test
pg_restore --dbname=backup_test $LATEST_BACKUP

if [ $? -eq 0 ]; then
  # Verify data integrity
  psql backup_test << EOF
  SELECT COUNT(*) FROM users;
  SELECT COUNT(*) FROM jobs;
  SELECT COUNT(*) FROM applications;
EOF

  dropdb backup_test
  echo "✅ Backup verification successful"
else
  echo "❌ Backup verification failed"
  # Alert team
  ./scripts/alert-team.sh --message="Backup verification failed"
fi
```

---

## Communication Plan

### Internal Communication

**Incident Commander:**
- Overall responsibility
- Decision authority
- Stakeholder communication

**Technical Team:**
- Execute recovery procedures
- Provide status updates every 15 minutes

**Communication Team:**
- User notifications
- Status page updates
- Media relations

### External Communication

**Users:**
```
Subject: Service Disruption Update

We are currently experiencing technical difficulties affecting our service.

Status: Investigating
Impact: Login and job search unavailable
ETA: 30 minutes

We apologize for the inconvenience and are working to resolve this as quickly as possible.

Updates: https://status.jobnaut.com
```

**Status Page Updates:**
1. Initial: "Investigating issues"
2. Identified: "Issue identified, working on resolution"
3. Monitoring: "Services restored, monitoring stability"
4. Resolved: "Issue resolved, all systems operational"

---

## Testing DR Plan

### Monthly DR Drill (2 hours)

```bash
#!/bin/bash
# scripts/monthly-dr-drill.sh

echo "Starting monthly DR drill..."

# 1. Simulate database failure
echo "Test 1: Database failure simulation"
./scripts/simulate-db-failure.sh
./scripts/restore-database.sh --test-mode
# Verify recovery time < 1 hour

# 2. Test failover to secondary region
echo "Test 2: Regional failover"
./scripts/failover-test.sh --dry-run
# Verify RTO < 30 minutes

# 3. Test backup restoration
echo "Test 3: Backup restore"
./scripts/test-backup-restore.sh
# Verify data integrity

# 4. Document results
./scripts/generate-dr-report.sh

echo "DR drill complete"
```

### Quarterly Full DR Test (8 hours)

- Complete regional failover
- Full system restoration from backup
- Security incident simulation
- Team coordination exercise
- Documentation review and update

---

## RTO and RPO Definitions

### Recovery Time Objective (RTO)

**Definition:** Maximum tolerable time to restore service after disruption

**Calculation:**
```
RTO = Detection Time + Response Time + Recovery Time + Verification Time
```

**Example:**
- Detection: 5 minutes (automated monitoring)
- Response: 10 minutes (team activation)
- Recovery: 30 minutes (failover execution)
- Verification: 10 minutes (testing)
- **Total RTO: 55 minutes**

### Recovery Point Objective (RPO)

**Definition:** Maximum tolerable data loss measured in time

**Calculation:**
```
RPO = Time between last successful backup and disaster occurrence
```

**Example:**
- Last backup: 1:00 AM
- Disaster occurs: 1:45 AM
- **RPO: 45 minutes of data loss**

---

## Appendix

### Emergency Contacts

**Internal:**
- Incident Commander: [Phone]
- Engineering Lead: [Phone]
- Database Admin: [Phone]
- Security Lead: [Phone]
- CTO: [Phone]

**External:**
- Cloud Provider Support: [Phone]
- Clerk Support: support@clerk.dev
- Database Hosting: [Phone]
- Cyber Insurance: [Phone]
- FBI Cybercrime: [Phone]

### Recovery Checklists

**Quick Reference:**
- [ ] Verify disaster scope
- [ ] Activate incident response team
- [ ] Update status page
- [ ] Execute appropriate recovery procedure
- [ ] Verify service restoration
- [ ] Monitor for stability
- [ ] Conduct post-mortem
- [ ] Update documentation

---

**Last Updated:** 2025-11-21
**Version:** 1.0
**Owner:** DevOps Team
**Next Review:** 2026-02-21
