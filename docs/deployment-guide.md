# JobNaut Deployment Guide

## Overview

This guide provides instructions for deploying JobNaut to production environments. The application consists of a backend API service and a frontend web application that can be deployed separately or together.

## Prerequisites

Before deploying, ensure you have:

1. A PostgreSQL database (version 12 or higher)
2. Clerk account credentials for authentication
3. Environment variables configured for production
4. Docker installed (optional, for containerized deployment)
5. Node.js 18+ installed (for direct deployment)

## Environment Configuration

### Backend Environment Variables

Create a `.env.production` file in the root directory with the following variables:

```env
# Database configuration
DATABASE_URL=postgresql://user:password@host:port/database_name

# Clerk configuration
CLERK_SECRET_KEY=your_production_clerk_secret_key

# Application configuration
NODE_ENV=production
PORT=3000

# Encryption configuration (32 bytes long)
ENCRYPTION_KEY=your_production_encryption_key_32_bytes_long_here
```

### Frontend Environment Variables

Create a `.env.production` file in the `frontend` directory with the following variables:

```env
# Backend API URL
API_BASE_URL=https://your-backend-domain.com

# Application configuration
NODE_ENV=production
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build and run with Docker Compose:**

```bash
# Build and start all services
docker-compose up -d

# Apply database migrations
docker-compose exec backend npm run prisma:migrate
```

2. **Individual service deployment:**

```bash
# Build backend
docker build -t jobnaut-backend .

# Build frontend
docker build -t jobnaut-frontend ./frontend

# Run containers
docker run -d --name jobnaut-backend -p 3000:3000 jobnaut-backend
docker run -d --name jobnaut-frontend -p 3001:3000 jobnaut-frontend
```

### Option 2: Direct Deployment

1. **Backend Deployment:**

```bash
# Install dependencies
npm install --production

# Build the application
npm run build

# Apply database migrations
npx prisma migrate deploy

# Start the application
npm start
```

2. **Frontend Deployment:**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install --production

# Build the application
npm run build

# Start the application
npm run start
```

## CI/CD Pipeline

The project includes GitHub Actions workflows for continuous integration and deployment:

- `.github/workflows/ci.yml` - Runs tests and code quality checks
- `.github/workflows/cd.yml` - Deploys to production environments

## Monitoring and Health Checks

The application includes built-in health check endpoints:

- Backend: `GET /health`
- Frontend: `GET /health`

Monitor these endpoints to ensure the application is running properly.

## Scaling Considerations

For production deployments, consider:

1. **Database Connection Pooling:** Configure connection pooling in your database settings
2. **Load Balancing:** Use a load balancer for multiple backend instances
3. **Caching:** Implement Redis for distributed caching in multi-instance deployments
4. **Rate Limiting:** Configure rate limiting to prevent abuse
5. **Logging:** Set up centralized logging for monitoring and debugging

## Security Best Practices

1. **Environment Variables:** Never commit sensitive environment variables to version control
2. **HTTPS:** Always use HTTPS in production
3. **CORS:** Configure CORS settings appropriately for your domain
4. **Input Validation:** All user inputs are validated and sanitized
5. **Rate Limiting:** Implement rate limiting to prevent abuse
6. **Security Headers:** The application uses Helmet.js for security headers

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Verify `DATABASE_URL` is correctly configured
   - Ensure the database is accessible from the deployment environment
   - Check database credentials

2. **Authentication Issues:**
   - Verify `CLERK_SECRET_KEY` is correctly set
   - Ensure Clerk webhook is configured properly

3. **Environment Variables Not Loading:**
   - Check that the `.env.production` file is in the correct location
   - Verify the application is loading the production environment

### Logs and Monitoring

Check application logs for error messages:

```bash
# For Docker deployments
docker-compose logs backend
docker-compose logs frontend

# For direct deployments
# Check logs in the console or configured logging system
```

## Rollback Procedures

In case of deployment issues:

1. **Rollback Database Migrations:**

   ```bash
   npx prisma migrate resolve --rolled-back "migration_name"
   ```

2. **Revert to Previous Version:**
   - Deploy the previous working version from your version control system
   - Restore database from backup if needed

3. **Health Check Monitoring:**
   - Monitor the health check endpoints to verify rollback success

## Post-Deployment Validation

After deployment, verify that:

1. [ ] Application is accessible via the configured domain
2. [ ] Health check endpoints return 200 OK
3. [ ] User authentication is working
4. [ ] Database connections are functioning
5. [ ] API endpoints are responding correctly
6. [ ] Frontend assets are loading properly
7. [ ] Search functionality is working
8. [ ] All external integrations are functioning

## Maintenance

Regular maintenance tasks:

1. **Database Backups:** Schedule regular database backups
2. **Dependency Updates:** Regularly update dependencies for security patches
3. **Log Rotation:** Implement log rotation to prevent disk space issues
4. **Performance Monitoring:** Monitor application performance and optimize as needed
