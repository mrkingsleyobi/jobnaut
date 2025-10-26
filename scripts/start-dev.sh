#!/bin/bash

# Script to start JobNaut development environment
echo "🚀 Starting JobNaut Development Environment..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait a moment for services to start
sleep 5

# Check service status
echo ""
echo "📋 Checking service status..."
docker-compose ps

echo ""
echo "✅ JobNaut Development Environment Started Successfully!"
echo ""
echo "Available services:"
echo "--------------------"
echo "Frontend (Nuxt 4): http://localhost:3001"
echo "Backend API: http://localhost:3000"
echo "  - Health check: http://localhost:3000/health"
echo "  - tRPC endpoint: http://localhost:3000/trpc"
echo "Database (PostgreSQL): localhost:5432"
echo "Search Engine (Meilisearch): http://localhost:7700"
echo ""
echo "To stop the services, run: docker-compose down"