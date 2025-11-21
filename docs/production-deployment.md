# JobNaut Production Deployment Guide

## Overview

This guide provides detailed instructions for deploying JobNaut to production environments. The application consists of a backend API service and a frontend web application that can be deployed separately or together using Docker containers.

## Prerequisites

Before deploying, ensure you have:

1. Docker and Docker Compose installed
2. A PostgreSQL database (version 12 or higher)
3. Clerk account credentials for authentication
4. Docker Hub account for image storage
5. Domain names configured for backend and frontend services

## Production Environment Setup

### 1. Backend Environment Configuration

Create a production environment file for the backend:

```bash
# Create .env.production in the root directory
cat > .env.production << EOF
# Database configuration
DATABASE_URL=postgresql://username:password@your-database-host:5432/jobnaut_prod

# Clerk configuration
CLERK_SECRET_KEY=your_production_clerk_secret_key

# Application configuration
NODE_ENV=production
PORT=3000

# Encryption configuration (32 bytes long)
ENCRYPTION_KEY=your_production_encryption_key_32_bytes_long_here
EOF
```

### 2. Frontend Environment Configuration

Create a production environment file for the frontend:

```bash
# Create .env.production in the frontend directory
cat > frontend/.env.production << EOF
# Backend API URL
API_BASE_URL=https://your-backend-domain.com

# Application configuration
NODE_ENV=production
EOF
```

## Docker Deployment (Recommended)

### 1. Build and Push Docker Images

```bash
# Build backend image
docker build -t jobnaut/backend:latest .

# Build frontend image
docker build -t jobnaut/frontend:latest ./frontend

# Push to Docker Hub (optional)
docker push jobnaut/backend:latest
docker push jobnaut/frontend:latest
```

### 2. Production Docker Compose Setup

Create a production docker-compose file:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  database:
    image: postgres:15-alpine
    container_name: jobnaut-db-prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER} -d ${DB_NAME}']
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Backend API Service
  backend:
    image: jobnaut/backend:latest
    container_name: jobnaut-backend-prod
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@database:5432/${DB_NAME}
      - NODE_ENV=production
      - PORT=3000
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      database:
        condition: service_healthy
    restart: unless-stopped

  # Frontend Service
  frontend:
    image: jobnaut/frontend:latest
    container_name: jobnaut-frontend-prod
    ports:
      - '3001:3000'
    environment:
      - NODE_ENV=production
      - API_BASE_URL=http://backend:3000
    depends_on:
      - backend
    restart: unless-stopped

  # Meilisearch Service
  meilisearch:
    image: getmeili/meilisearch:v1.13
    container_name: jobnaut-meilisearch-prod
    ports:
      - '7700:7700'
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - MEILI_ENV=production
    volumes:
      - meilisearch_data:/meili_data
    restart: unless-stopped

volumes:
  postgres_data:
  meilisearch_data:
```

### 3. Deploy Using Docker Compose

```bash
# Create environment file for docker-compose
cat > .env.prod << EOF
DB_USER=jobnaut_user
DB_PASSWORD=your_secure_password
DB_NAME=jobnaut_prod
CLERK_SECRET_KEY=your_production_clerk_secret_key
ENCRYPTION_KEY=your_production_encryption_key_32_bytes_long_here
MEILI_MASTER_KEY=your_meilisearch_master_key
EOF

# Deploy to production
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Apply database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate
```

## CI/CD Pipeline Deployment

### GitHub Actions Workflow

The project includes automated CI/CD pipelines:

1. **CI Pipeline**: Runs tests and builds on every push
2. **CD Pipeline**: Automatically deploys to production on main branch pushes

To enable automatic deployment:

1. Set up Docker Hub credentials as GitHub secrets:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`

2. The workflow will automatically:
   - Run all tests
   - Build Docker images
   - Push images to Docker Hub
   - Deploy to production

## Monitoring and Health Checks

### Health Check Endpoints

- Backend: `GET /health`
- Frontend: `GET /health`

### Monitoring Setup

1. **Application Logs**:

   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

2. **System Monitoring**:
   - CPU and memory usage
   - Database connection pool
   - Request response times
   - Error rates

3. **External Monitoring**:
   - Set up uptime monitoring for health endpoints
   - Configure alerting for critical errors
   - Monitor database performance

## Security Best Practices

### 1. Environment Variables

Never commit sensitive environment variables to version control. Use secret management or environment files that are excluded from version control.

### 2. HTTPS Configuration

Always use HTTPS in production with valid SSL certificates.

### 3. CORS Configuration

Configure CORS settings appropriately for your production domain.

### 4. Rate Limiting

The application includes built-in rate limiting. Configure limits based on your expected traffic.

### 5. Security Headers

The application uses Helmet.js for security headers. Review and customize as needed.

## Post-Deployment Validation

After deployment, verify that:

- [x] Application is accessible via the configured domain
- [x] Health check endpoints return 200 OK
- [x] User authentication is working
- [x] Database connections are functioning
- [x] API endpoints are responding correctly
- [x] Frontend assets are loading properly
- [x] Search functionality is working
- [x] All external integrations are functioning

## Rollback Procedures

In case of deployment issues:

1. **Rollback Database Migrations**:

   ```bash
   npx prisma migrate resolve --rolled-back "migration_name"
   ```

2. **Revert to Previous Version**:
   - Deploy the previous working version from Docker Hub
   - Restore database from backup if needed

3. **Health Check Monitoring**:
   - Monitor the health check endpoints to verify rollback success

## Maintenance

Regular maintenance tasks:

1. **Database Backups**: Schedule regular database backups
2. **Dependency Updates**: Regularly update dependencies for security patches
3. **Log Rotation**: Implement log rotation to prevent disk space issues
4. **Performance Monitoring**: Monitor application performance and optimize as needed

## Scaling Considerations

For production deployments with high traffic:

1. **Database Connection Pooling**: Configure connection pooling in your database settings
2. **Load Balancing**: Use a load balancer for multiple backend instances
3. **Caching**: Implement Redis for distributed caching in multi-instance deployments
4. **Rate Limiting**: Configure rate limiting to prevent abuse
5. **Logging**: Set up centralized logging for monitoring and debugging
