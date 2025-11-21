# JobNaut Backend Dockerfile
# Multi-stage build for optimized and secure production image
#
# SECURITY SCANNING:
# Before deploying to production, scan this image for vulnerabilities:
#   docker scan jobnaut/backend:latest
#   trivy image jobnaut/backend:latest
#   snyk container test jobnaut/backend:latest
#
# Regular security updates:
#   docker pull node:20-slim  # Pull latest base image with security patches
#   docker build --no-cache -t jobnaut/backend:latest .  # Rebuild without cache

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-slim AS dependencies

# Set working directory
WORKDIR /app

# Install OpenSSL for Prisma (required for database connectivity)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including devDependencies for Prisma generation)
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma

# Copy application source code
COPY package*.json ./
COPY . .

# Remove development files and unnecessary content
RUN rm -rf tests/ .git/ .gitignore README.md *.md

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

# Install OpenSSL for Prisma runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

WORKDIR /app

# Copy only production dependencies and built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid 1001 --no-create-home --shell /bin/false nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1) })"

# Start the application
CMD ["node", "src/server.js"]