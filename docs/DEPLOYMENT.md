# JobNaut Deployment Guide

This comprehensive guide covers deployment procedures, environment setup, rollback strategies, and troubleshooting for the JobNaut platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Database Migrations](#database-migrations)
- [Rollback Procedures](#rollback-procedures)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Overview

JobNaut uses a modern CI/CD pipeline with GitHub Actions for automated deployments to staging and production environments.

### Architecture

```
┌─────────────┐
│   GitHub    │
│   Actions   │
└──────┬──────┘
       │
       ├──────────────────────┬──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
  ┌─────────┐          ┌──────────┐          ┌────────────┐
  │  Build  │          │ Security │          │   Test     │
  │ Docker  │          │   Scan   │          │   Suite    │
  │ Images  │          └──────────┘          └────────────┘
  └────┬────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
  ┌─────────┐      ┌──────────┐     ┌────────────┐
  │ Staging │      │   Prod   │     │   GitHub   │
  │  Deploy │      │  Deploy  │     │  Registry  │
  └─────────┘      └──────────┘     └────────────┘
```

### Deployment Workflow

1. **Code Push** → Triggers CI/CD pipeline
2. **Test & Build** → Runs tests and builds Docker images
3. **Security Scan** → Scans for vulnerabilities
4. **Deploy** → Deploys to staging/production
5. **Health Checks** → Validates deployment
6. **Notifications** → Sends status updates

## Prerequisites

### Required Tools

- Node.js >= 18.0.0
- Docker >= 20.10
- Docker Compose >= 2.0
- PostgreSQL >= 14
- Git

### Access Requirements

- GitHub repository access
- Container registry credentials (GHCR)
- SSH access to deployment servers
- Database credentials
- Slack webhook (for notifications)

### Environment Variables

Create the following secrets in GitHub:

**Common:**
- `GITHUB_TOKEN` - Automatically provided
- `SLACK_WEBHOOK_URL` - Slack notifications
- `CODECOV_TOKEN` - Code coverage reports
- `SNYK_TOKEN` - Security scanning

**Staging:**
- `STAGING_HOST` - Staging server hostname
- `STAGING_USER` - SSH username
- `STAGING_SSH_KEY` - SSH private key
- `STAGING_DATABASE_URL` - PostgreSQL connection string

**Production:**
- `PRODUCTION_HOST` - Production server hostname
- `PRODUCTION_USER` - SSH username
- `PRODUCTION_SSH_KEY` - SSH private key
- `PRODUCTION_DATABASE_URL` - PostgreSQL connection string

## Environment Setup

### Initial Server Setup

1. **Install Docker and Docker Compose:**

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Create application directory:**

```bash
sudo mkdir -p /opt/jobnaut
sudo chown $USER:$USER /opt/jobnaut
cd /opt/jobnaut
```

3. **Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  backend:
    image: ${BACKEND_IMAGE}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: ${FRONTEND_IMAGE}
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=jobnaut
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

4. **Set up environment file:**

```bash
cat > .env << EOF
BACKEND_IMAGE=ghcr.io/jobnaut/jobnaut-backend:latest
FRONTEND_IMAGE=ghcr.io/jobnaut/jobnaut-frontend:latest
DATABASE_URL=postgresql://user:pass@postgres:5432/jobnaut
DB_USER=jobnaut
DB_PASSWORD=<secure-password>
EOF
```

5. **Configure firewall:**

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Deployment Process

### Automatic Deployment

Deployments are triggered automatically:

- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch

### Manual Deployment

For manual deployments:

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Set environment variables
export DEPLOY_HOST="your-server.com"
export DEPLOY_USER="deploy"
export DEPLOY_KEY="$(cat ~/.ssh/deploy_key)"
export IMAGE_TAG="main-abc123"

# 3. Run deployment
./scripts/deploy.sh production
```

### Deployment Steps

The deployment script performs:

1. **Pre-deployment checks**
   - Validates environment variables
   - Sets up SSH connection
   - Creates backup

2. **Image deployment**
   - Pulls latest Docker images
   - Stores previous version
   - Updates docker-compose configuration

3. **Container orchestration**
   - Stops existing containers
   - Starts new containers
   - Waits for health checks

4. **Post-deployment**
   - Runs health checks
   - Cleans up old images
   - Tags deployment

## Database Migrations

### Running Migrations

Migrations are automatically run during deployment, but can be run manually:

```bash
# Check migration status
./scripts/db-migrate.sh production status

# Apply migrations
./scripts/db-migrate.sh production up

# Rollback migrations
./scripts/db-migrate.sh production down
```

### Migration Workflow

1. **Pre-migration backup:**
   - Automatic backup created
   - Stored in `/backups/db/`

2. **Migration execution:**
   - Prisma generate
   - Prisma migrate deploy
   - Verification checks

3. **Post-migration:**
   - Connection verification
   - Status check
   - Health validation

### Creating New Migrations

```bash
# Development
npm run prisma:migrate

# This creates a new migration file
npx prisma migrate dev --name add_user_preferences

# Generate Prisma client
npm run prisma:generate
```

## Rollback Procedures

### Automatic Rollback

Production deployments automatically rollback on failure:

1. Health check fails
2. Smoke tests fail
3. Container startup fails

### Manual Rollback

```bash
# Rollback to previous version
./scripts/rollback.sh production

# Rollback to specific version
./scripts/rollback.sh production main-abc123
```

### Rollback Process

1. **Backup current state:**
   - Container status
   - Image information
   - Configuration

2. **Version restoration:**
   - Pull previous images
   - Update configuration
   - Restart containers

3. **Verification:**
   - Health checks
   - Service availability
   - Database connectivity

### Database Rollback

For database rollback:

```bash
# List available backups
ls -lht /opt/jobnaut/backups/db/

# Restore from backup
./scripts/db-migrate.sh production down
# Then follow prompts to restore from backup
```

## Health Checks

### Automated Health Checks

The pipeline runs health checks after deployment:

```bash
./scripts/health-check.sh production
```

### Health Check Components

1. **Backend API**
   - `/api/health` - Service health
   - `/api/health/db` - Database connectivity
   - `/api/health/redis` - Redis connectivity

2. **Frontend**
   - Homepage accessibility
   - Static asset loading
   - Response time

3. **Infrastructure**
   - SSL certificate validity
   - Container health status
   - Service availability

### Manual Health Verification

```bash
# Quick health check
curl https://jobnaut.com/api/health

# Detailed status
curl https://jobnaut.com/api/health/status | jq '.'

# Frontend check
curl -I https://jobnaut.com
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails

**Symptoms:** GitHub Action fails during deployment

**Solutions:**
```bash
# Check logs
docker-compose logs -f

# Verify images
docker images | grep jobnaut

# Check SSH connection
ssh -i ~/.ssh/deploy_key user@server

# Verify environment variables
cat /opt/jobnaut/.env
```

#### 2. Database Connection Errors

**Symptoms:** Backend cannot connect to database

**Solutions:**
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec backend npx prisma db execute --stdin <<< "SELECT 1;"

# Verify DATABASE_URL
docker-compose exec backend env | grep DATABASE_URL
```

#### 3. Container Won't Start

**Symptoms:** Container exits immediately

**Solutions:**
```bash
# Check container logs
docker-compose logs backend

# Inspect container
docker inspect jobnaut_backend

# Try running manually
docker run -it ghcr.io/jobnaut/jobnaut-backend:latest /bin/sh

# Check health
docker-compose ps
```

#### 4. Image Pull Failures

**Symptoms:** Cannot pull Docker images

**Solutions:**
```bash
# Login to registry
docker login ghcr.io

# Verify image exists
docker pull ghcr.io/jobnaut/jobnaut-backend:latest

# Check credentials
cat ~/.docker/config.json
```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment
export DEBUG=true
export LOG_LEVEL=debug

# Redeploy with verbose output
./scripts/deploy.sh production
```

### Emergency Procedures

#### Complete System Failure

1. **Immediate rollback:**
   ```bash
   ./scripts/rollback.sh production
   ```

2. **Restore database:**
   ```bash
   cd /opt/jobnaut/backups/db
   # Find latest backup
   ls -lt | head -5
   # Restore (backup filename from above)
   psql $DATABASE_URL < backup_production_20231121_120000.sql
   ```

3. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

#### Data Corruption

1. **Stop affected services**
2. **Restore from latest backup**
3. **Verify data integrity**
4. **Resume operations**

## Security

### Secrets Management

- **Never commit secrets to Git**
- Use GitHub Secrets for CI/CD
- Rotate credentials regularly
- Use strong passwords (minimum 16 characters)

### SSL/TLS

```bash
# Check certificate
openssl s_client -connect jobnaut.com:443 -servername jobnaut.com

# Renew Let's Encrypt certificate
certbot renew
```

### Docker Security

```bash
# Scan images for vulnerabilities
docker scan ghcr.io/jobnaut/jobnaut-backend:latest

# Use Trivy
trivy image ghcr.io/jobnaut/jobnaut-backend:latest

# Use Snyk
snyk container test ghcr.io/jobnaut/jobnaut-backend:latest
```

### Access Control

- Use SSH keys (no passwords)
- Implement least privilege principle
- Audit access logs regularly
- Enable 2FA on GitHub

## Monitoring & Alerts

### Key Metrics

- Response time
- Error rate
- CPU/Memory usage
- Database connections
- Active users

### Log Locations

```bash
# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# System logs
journalctl -u docker
/var/log/syslog
```

### Alerts Configuration

Configure Slack notifications in GitHub Secrets:
- `SLACK_WEBHOOK_URL` - For deployment notifications

## Best Practices

1. **Always test in staging first**
2. **Create backups before major changes**
3. **Monitor deployments for at least 5 minutes**
4. **Document all manual interventions**
5. **Keep deployment scripts updated**
6. **Review logs after each deployment**
7. **Maintain rollback readiness**

## Support

### Getting Help

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Runbooks**: `/docs/runbooks`

### Escalation Path

1. Check this documentation
2. Review logs and metrics
3. Attempt rollback if critical
4. Contact team lead
5. Escalate to infrastructure team

---

**Last Updated**: 2024-11-21
**Version**: 1.0.0
**Maintained By**: DevOps Team
