# Production Deployment Checklist

**Project:** JobNaut - AI-Powered Job Market Navigator
**Version:** 1.0.0
**Date:** 2025-11-21
**Deployment Target:** Production

---

## 🚨 Critical Pre-Deployment Actions

### 1. Code Quality & Security Fixes Required

#### **HIGH PRIORITY - Must Fix Before Deployment**

- [ ] **Remove Console Statements** (35 files affected)
  ```bash
  # Run ESLint fix to remove console.log statements
  npm run lint:fix
  # Manually review and replace with proper logging
  ```
  Affected files include:
  - `frontend/composables/useAuth.ts`
  - `src/auth/middleware.js`
  - `src/server.js`
  - All service files

- [ ] **Complete Authentication Implementation**
  Fix 6 TODO items in `frontend/composables/useAuth.ts`:
  - Replace mock authentication with actual Clerk implementation
  - Implement OAuth callback handling
  - Complete password reset functionality
  - Add proper logout implementation

- [ ] **Migrate ESLint Configuration**
  ```bash
  # ESLint v9 requires new config format
  # Rename .eslintrc.js to eslint.config.js and update syntax
  # See: https://eslint.org/docs/latest/use/configure/migration-guide
  ```

- [ ] **Format All Code**
  ```bash
  npm run format
  cd frontend && npm run format
  ```
  17 files need formatting (see list in validation results)

#### **MEDIUM PRIORITY - Recommended**

- [ ] **Implement Load Testing**
  - k6 tests are missing
  - Create basic load test scenarios
  - Test expected production traffic patterns

### 2. Environment Configuration

#### **Required Actions**

- [ ] **Create Production Secrets Directory**
  ```bash
  mkdir -p secrets
  chmod 700 secrets
  ```

- [ ] **Generate and Store Production Secrets**
  Create the following secret files in `secrets/`:

  ```bash
  # Database credentials
  echo "jobnaut_prod_user" > secrets/db_user.txt
  echo "$(openssl rand -base64 32)" > secrets/db_password.txt
  echo "jobnaut_production" > secrets/db_name.txt

  # Application secrets
  echo "YOUR_PRODUCTION_CLERK_KEY" > secrets/clerk_secret_key.txt
  echo "$(openssl rand -base64 32)" > secrets/encryption_key.txt
  echo "$(openssl rand -base64 32)" > secrets/redis_password.txt
  echo "$(openssl rand -base64 32)" > secrets/meili_master_key.txt

  # Set proper permissions
  chmod 600 secrets/*.txt
  ```

- [ ] **Verify Secrets Are Not in Git**
  ```bash
  git ls-files secrets/
  # Should return nothing
  git ls-files .env.production
  # Should return nothing
  ```

- [ ] **Update Production Domain in CORS**
  Edit `src/index.js` and `src/server.js`:
  ```javascript
  // Replace 'https://yourdomain.com' with actual production domain
  const allowedOrigins = [
    'https://jobnaut.com',  // Update this
    'https://www.jobnaut.com',  // Update this
  ];
  ```

### 3. Security Validation

- [ ] **SSL/TLS Certificates**
  - [ ] Obtain production SSL certificates
  - [ ] Configure reverse proxy (Nginx/Traefik) with HTTPS
  - [ ] Enable HTTP to HTTPS redirect
  - [ ] Verify certificate chain

- [ ] **Docker Security Scan**
  ```bash
  # Scan backend image
  docker build -t jobnaut/backend:latest .
  docker scan jobnaut/backend:latest

  # Or use Trivy
  trivy image jobnaut/backend:latest

  # Scan frontend image
  docker build -t jobnaut/frontend:latest ./frontend
  trivy image jobnaut/frontend:latest
  ```

- [ ] **Verify Security Headers**
  After deployment, test with:
  ```bash
  curl -I https://your-domain.com/health
  # Verify headers: HSTS, CSP, X-Frame-Options, etc.
  ```

- [ ] **Rate Limiting Configuration**
  - [ ] General API: 100 requests/15min ✅ (configured)
  - [ ] Auth endpoints: 5 requests/15min ✅ (configured)
  - [ ] Consider lowering for production if needed

- [ ] **Database Security**
  - [ ] PostgreSQL is NOT exposed to host ✅ (configured)
  - [ ] Redis requires password ✅ (configured)
  - [ ] Database uses secrets management ✅ (configured)

### 4. Database & Data Migration

- [ ] **Backup Preparation**
  ```bash
  # Setup automated backups
  # Configure pg_dump cron job
  ```

- [ ] **Run Migrations**
  ```bash
  docker-compose -f docker-compose.prod.yml run backend npx prisma migrate deploy
  ```

- [ ] **Verify Database Schema**
  ```bash
  docker-compose -f docker-compose.prod.yml run backend npx prisma db push --preview-feature
  ```

- [ ] **Test Database Connections**
  ```bash
  # Verify all services can connect to database
  docker-compose -f docker-compose.prod.yml logs backend | grep "database"
  ```

### 5. Performance Optimization

- [ ] **Build Production Images**
  ```bash
  docker build -t jobnaut/backend:latest .
  docker build -t jobnaut/frontend:latest ./frontend
  ```

- [ ] **Verify Image Sizes**
  ```bash
  docker images | grep jobnaut
  # Backend should be < 500MB
  # Frontend should be < 200MB
  ```

- [ ] **Test Cache Performance**
  - [ ] Verify Redis is accessible
  - [ ] Test cache hit/miss ratios
  - [ ] Confirm TTL settings (300s default)

- [ ] **Database Query Optimization**
  - [ ] Enable query logging in development
  - [ ] Identify slow queries
  - [ ] Add appropriate indexes

### 6. Monitoring & Logging Setup

- [ ] **Configure Log Aggregation**
  - [ ] Setup log volume mounts
  - [ ] Configure log rotation
  - [ ] Setup external log monitoring (CloudWatch, DataDog, etc.)

- [ ] **Health Check Endpoints**
  - [ ] Backend: `http://localhost:3000/health` ✅
  - [ ] Test health checks return proper status

- [ ] **Application Monitoring**
  - [ ] Setup APM (Application Performance Monitoring)
  - [ ] Configure error tracking (Sentry, Rollbar, etc.)
  - [ ] Setup uptime monitoring (Pingdom, UptimeRobot, etc.)

---

## 🚀 Deployment Steps

### Phase 1: Pre-Deployment (Day -1)

1. **Final Code Review**
   ```bash
   git checkout main
   git pull origin main
   npm run test
   npm run lint
   npm run format:check
   ```

2. **Build and Test Locally**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   # Run smoke tests
   docker-compose -f docker-compose.prod.yml down
   ```

3. **Tag Release**
   ```bash
   git tag -a v1.0.0 -m "Production release v1.0.0"
   git push origin v1.0.0
   ```

### Phase 2: Deployment (Day 0)

1. **Backup Current State** (if upgrading)
   ```bash
   # Backup database
   docker-compose exec database pg_dump -U postgres jobnaut_production > backup_$(date +%Y%m%d_%H%M%S).sql

   # Backup volumes
   docker run --rm -v jobnaut_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_data_$(date +%Y%m%d_%H%M%S).tar.gz /data
   ```

2. **Deploy to Production Server**
   ```bash
   # SSH to production server
   ssh user@production-server

   # Pull latest code
   cd /app/jobnaut
   git pull origin main
   git checkout v1.0.0

   # Build production images
   docker-compose -f docker-compose.prod.yml build

   # Stop existing services (if any)
   docker-compose -f docker-compose.prod.yml down

   # Start new services
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run Database Migrations**
   ```bash
   docker-compose -f docker-compose.prod.yml run backend npx prisma migrate deploy
   ```

4. **Verify Services Started**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   # All services should show "Up" status
   ```

### Phase 3: Post-Deployment Verification

1. **Health Checks**
   ```bash
   # Backend health
   curl https://api.jobnaut.com/health
   # Expected: {"status":"OK","timestamp":"...","service":"JobNaut API"}

   # Frontend access
   curl -I https://jobnaut.com
   # Expected: 200 OK
   ```

2. **Smoke Tests**
   - [ ] Test user registration
   - [ ] Test login
   - [ ] Test job search
   - [ ] Test AI chat functionality
   - [ ] Test saved jobs feature

3. **Performance Checks**
   ```bash
   # Check response times
   curl -w "@curl-format.txt" -o /dev/null -s https://api.jobnaut.com/health

   # Monitor resource usage
   docker stats
   ```

4. **Log Verification**
   ```bash
   # Check for errors
   docker-compose -f docker-compose.prod.yml logs --tail=100 | grep -i error

   # Verify services are logging
   docker-compose -f docker-compose.prod.yml logs backend | tail -20
   docker-compose -f docker-compose.prod.yml logs frontend | tail -20
   ```

5. **Database Connectivity**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npx prisma db pull
   # Should connect successfully
   ```

---

## 🔄 Rollback Procedures

### Scenario 1: Application Issues

```bash
# Quick rollback to previous version
docker-compose -f docker-compose.prod.yml down

# Checkout previous stable tag
git checkout v0.9.9  # Previous stable version

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Scenario 2: Database Migration Issues

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database from backup
docker-compose -f docker-compose.prod.yml up -d database
docker-compose exec database psql -U postgres jobnaut_production < backup_YYYYMMDD_HHMMSS.sql

# Rollback to previous version
git checkout v0.9.9
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Scenario 3: Critical Security Issue

```bash
# Immediate shutdown
docker-compose -f docker-compose.prod.yml down

# Investigate and fix
# ... fix security issue ...

# Deploy hotfix
git tag -a v1.0.1-hotfix -m "Security hotfix"
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Post-Deployment Monitoring

### Week 1 - Intensive Monitoring

- [ ] **Daily Health Checks**
  - Response times
  - Error rates
  - Resource utilization
  - Database performance

- [ ] **User Feedback**
  - Monitor support tickets
  - Check user reports
  - Review error logs

- [ ] **Performance Metrics**
  - API response times < 500ms
  - Page load times < 2s
  - Database query times < 100ms
  - Cache hit ratio > 80%

### Month 1 - Ongoing Monitoring

- [ ] **Weekly Reviews**
  - Performance trends
  - Error patterns
  - Resource usage trends
  - Security incidents

- [ ] **Optimization Opportunities**
  - Identify slow queries
  - Optimize cache usage
  - Scale resources if needed

---

## 📝 Sign-Off Checklist

### Technical Lead
- [ ] All critical fixes completed
- [ ] Code quality standards met
- [ ] Security review completed
- [ ] Performance benchmarks met

### DevOps
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backup systems tested
- [ ] Rollback procedures verified

### Security
- [ ] Security scan completed
- [ ] Secrets management verified
- [ ] SSL certificates configured
- [ ] Access controls implemented

### Product Owner
- [ ] Feature requirements met
- [ ] User acceptance testing passed
- [ ] Documentation updated
- [ ] Support team trained

---

## 🆘 Emergency Contacts

**Technical Issues:**
- DevOps Lead: [contact]
- Backend Lead: [contact]
- Frontend Lead: [contact]

**Security Issues:**
- Security Lead: [contact]
- On-Call Engineer: [contact]

**Business Issues:**
- Product Owner: [contact]
- Customer Support: [contact]

---

## 📚 Additional Resources

- [Production Deployment Guide](./production-deployment.md)
- [Docker Security Guide](./DOCKER_SECURITY.md)
- [Rollback Plan](./rollback-plan.md)
- [Security Enhancements](./security-enhancements.md)
- [Load Testing Guide](./load-testing.md)

---

**Last Updated:** 2025-11-21
**Next Review:** Before each production deployment
