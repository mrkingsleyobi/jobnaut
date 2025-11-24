#!/bin/bash

# Test script for JobNaut monitoring infrastructure
# Verifies that all monitoring components are working correctly

set -e

echo "======================================"
echo "JobNaut Monitoring Infrastructure Test"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing ${name}... "

    if command -v curl &> /dev/null; then
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

        if [ "$response_code" -eq "$expected_code" ]; then
            echo -e "${GREEN}✓ PASS${NC} (HTTP $response_code)"
        else
            echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_code, got $response_code)"
        fi
    else
        echo -e "${YELLOW}⚠ SKIP${NC} (curl not installed)"
    fi
}

# Test if Docker is running
echo -n "Checking Docker... "
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    echo "Please start Docker to test monitoring stack"
fi

echo ""
echo "Application Endpoints:"
echo "----------------------"
test_endpoint "Application Root" "http://localhost:3001/"
test_endpoint "Health Check (Basic)" "http://localhost:3001/health"
test_endpoint "Health Check (Detailed)" "http://localhost:3001/health/detailed"
test_endpoint "Health Check (Live)" "http://localhost:3001/health/live"
test_endpoint "Health Check (Ready)" "http://localhost:3001/health/ready"
test_endpoint "Metrics Endpoint" "http://localhost:3001/metrics"

echo ""
echo "Monitoring Stack:"
echo "-----------------"
test_endpoint "Prometheus" "http://localhost:9090/-/healthy"
test_endpoint "Grafana" "http://localhost:3002/api/health"
test_endpoint "Node Exporter" "http://localhost:9100/metrics"
test_endpoint "Alertmanager" "http://localhost:9093/-/healthy"

echo ""
echo "Docker Services Status:"
echo "----------------------"
if command -v docker &> /dev/null; then
    if docker-compose -f docker-compose.monitoring.yml ps &> /dev/null 2>&1; then
        docker-compose -f docker-compose.monitoring.yml ps
    elif docker compose -f docker-compose.monitoring.yml ps &> /dev/null 2>&1; then
        docker compose -f docker-compose.monitoring.yml ps
    else
        echo "Monitoring stack not started. Run:"
        echo "  docker-compose -f docker-compose.monitoring.yml up -d"
    fi
fi

echo ""
echo "Configuration Files:"
echo "-------------------"
files=(
    "src/utils/sentry.js"
    "src/middleware/metrics.js"
    "src/routes/health.js"
    "frontend/plugins/sentry.js"
    "monitoring/prometheus/prometheus.yml"
    "monitoring/grafana/dashboards/jobnaut-overview.json"
    "monitoring/alertmanager/config.yml"
    "docker-compose.monitoring.yml"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (missing)"
    fi
done

echo ""
echo "Environment Configuration:"
echo "-------------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"

    # Check for required variables
    required_vars=("SENTRY_DSN" "LOG_LEVEL" "PROMETHEUS_ENABLED")
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $var is set"
        else
            echo -e "  ${YELLOW}⚠${NC} $var not set (check .env.example)"
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env file not found (copy from .env.example)"
fi

echo ""
echo "Package Dependencies:"
echo "--------------------"
if [ -f "package.json" ]; then
    if grep -q "@sentry/node" package.json; then
        echo -e "${GREEN}✓${NC} @sentry/node installed"
    else
        echo -e "${RED}✗${NC} @sentry/node not found"
    fi

    if grep -q "prom-client" package.json; then
        echo -e "${GREEN}✓${NC} prom-client installed"
    else
        echo -e "${RED}✗${NC} prom-client not found"
    fi
fi

if [ -f "frontend/package.json" ]; then
    if grep -q "@sentry/vue" frontend/package.json; then
        echo -e "${GREEN}✓${NC} @sentry/vue installed (frontend)"
    else
        echo -e "${RED}✗${NC} @sentry/vue not found (frontend)"
    fi
fi

echo ""
echo "======================================"
echo "Test Complete!"
echo ""
echo "Next Steps:"
echo "1. Start monitoring stack: docker-compose -f docker-compose.monitoring.yml up -d"
echo "2. Start application: npm start"
echo "3. Access Grafana: http://localhost:3002 (admin/admin)"
echo "4. View metrics: http://localhost:3001/metrics"
echo "5. Check health: http://localhost:3001/health/detailed"
echo ""
echo "Documentation:"
echo "- Comprehensive guide: docs/MONITORING.md"
echo "- Setup summary: docs/MONITORING_SETUP_SUMMARY.md"
echo "- Stack README: monitoring/README.md"
echo "======================================"
