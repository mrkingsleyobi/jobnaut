# Docker Security Documentation

## Overview

This document describes the security improvements implemented in the JobNaut Docker configuration.

## Security Enhancements

### 1. Database Port Isolation

**Issue**: Database port (5432) was exposed to the host, allowing external connections.

**Fix**: Removed port mapping from `docker-compose.prod.yml`. Database is now only accessible within the Docker network.

```yaml
# BEFORE (Insecure)
database:
  ports:
    - "5432:5432"  # Exposed to host

# AFTER (Secure)
database:
  # No ports exposed - internal network only
```

### 2. Docker Secrets Implementation

**Issue**: Sensitive data (passwords, API keys) stored in environment variables.

**Fix**: Migrated to Docker secrets for sensitive credentials.

#### Setup Instructions

1. Create secrets directory:

```bash
mkdir -p secrets
```

2. Create secret files:

```bash
echo "your_db_user" > secrets/db_user.txt
echo "your_secure_password" > secrets/db_password.txt
echo "jobnaut_db" > secrets/db_name.txt
echo "clerk_secret_key_here" > secrets/clerk_secret_key.txt
echo "32_byte_encryption_key" > secrets/encryption_key.txt
echo "meili_master_key_here" > secrets/meili_master_key.txt
```

3. Set proper permissions:

```bash
chmod 600 secrets/*.txt
chown root:root secrets/*.txt
```

4. Add to .gitignore:

```bash
echo "secrets/" >> .gitignore
```

### 3. Resource Limits

**Issue**: No resource constraints on containers, risking resource exhaustion attacks.

**Fix**: Added CPU and memory limits to all services.

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Resource Allocation:**

- **Database**: 2 CPU cores max, 2GB RAM max
- **Backend**: 2 CPU cores max, 2GB RAM max
- **Frontend**: 1 CPU core max, 1GB RAM max
- **Meilisearch**: 1 CPU core max, 1GB RAM max

### 4. Multi-Stage Docker Builds

**Issue**: Production images contained development dependencies and build tools.

**Fix**: Implemented multi-stage builds for both backend and frontend.

#### Backend (Node.js)

- **Stage 1**: Install dependencies
- **Stage 2**: Build application
- **Stage 3**: Production image with only runtime dependencies

**Size Reduction**: ~40-60% smaller image size

#### Frontend (Nuxt with Nginx)

- **Stage 1**: Install dependencies
- **Stage 2**: Build static assets
- **Stage 3**: Nginx production image serving static files

**Size Reduction**: ~70-80% smaller image size (Node.js → Nginx)

### 5. Non-Root User Execution

**Status**: Already implemented in original Dockerfiles ✅

Both backend and frontend containers run as non-root users (UID 1001) to minimize privilege escalation risks.

### 6. Security Headers (Frontend)

Nginx configuration includes security headers:

- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: XSS protection
- `Referrer-Policy`: Controls referrer information
- `Content-Security-Policy`: CSP protection

### 7. Additional Security Configurations

Available in `docker-compose.prod.override.yml.example`:

- **Read-only filesystem**: Where possible
- **Security options**: `no-new-privileges:true`
- **Capability dropping**: Minimal capabilities with `cap_drop: ALL`
- **Specific capability grants**: Only required capabilities added back

## Security Scanning

### Recommended Tools

1. **Docker Scan** (built-in):

```bash
docker scan jobnaut/backend:latest
docker scan jobnaut/frontend:latest
```

2. **Trivy** (comprehensive):

```bash
trivy image jobnaut/backend:latest
trivy image jobnaut/frontend:latest
```

3. **Snyk** (CI/CD integration):

```bash
snyk container test jobnaut/backend:latest
snyk container test jobnaut/frontend:latest
```

### Scanning Schedule

- **Before deployment**: Always scan images
- **Regular intervals**: Weekly automated scans
- **Base image updates**: After pulling new base images

## Best Practices Checklist

- [ ] Secrets stored in files, not environment variables
- [ ] Database not exposed to host network
- [ ] Resource limits configured for all services
- [ ] Multi-stage builds implemented
- [ ] Containers run as non-root users
- [ ] Regular security scanning enabled
- [ ] Security headers configured
- [ ] Read-only filesystems where applicable
- [ ] Minimal capabilities granted
- [ ] Docker Content Trust enabled (`DOCKER_CONTENT_TRUST=1`)

## Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
# With secrets
docker-compose -f docker-compose.prod.yml up -d

# With additional security overrides
docker-compose -f docker-compose.prod.yml -f docker-compose.prod.override.yml up -d
```

### Docker Swarm (Alternative)

For production environments using Docker Swarm:

```bash
# Create external secrets
echo "password" | docker secret create db_password -
echo "clerk_key" | docker secret create clerk_secret_key -

# Deploy stack
docker stack deploy -c docker-compose.prod.yml jobnaut
```

## Maintenance

### Secret Rotation

1. Create new secret files with updated values
2. Update secret references in compose file
3. Restart services:

```bash
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Image Updates

1. Pull latest base images:

```bash
docker pull node:20-slim
docker pull nginx:1.27-alpine
docker pull postgres:15-alpine
```

2. Rebuild without cache:

```bash
docker build --no-cache -t jobnaut/backend:latest .
docker build --no-cache -t jobnaut/frontend:latest ./frontend
```

3. Scan for vulnerabilities
4. Deploy updated images

## Security Incident Response

If a security vulnerability is detected:

1. **Assess severity** using CVSS score
2. **Isolate affected containers** if actively exploited
3. **Update base images** or dependencies
4. **Rebuild and rescan** images
5. **Test thoroughly** in staging
6. **Deploy to production** with monitoring
7. **Document incident** and lessons learned

## References

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
