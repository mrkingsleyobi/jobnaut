# JobNaut Backend Dockerfile

# Use Node.js LTS version (non-Alpine for better Prisma compatibility)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Create non-root user
RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid 1001 nextjs
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1) })"

# Start the application
CMD ["node", "src/server.js"]