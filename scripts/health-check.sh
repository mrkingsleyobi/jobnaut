#!/bin/bash

##############################################################################
# JobNaut Health Check Script
#
# This script performs comprehensive health checks on deployed applications
#
# Usage: ./health-check.sh [staging|production]
#
# Environment Variables:
#   HEALTH_CHECK_URL - Base URL for health checks
##############################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
MAX_RETRIES=5
RETRY_DELAY=10

# Set base URL based on environment
if [[ -n "${HEALTH_CHECK_URL:-}" ]]; then
    BASE_URL="$HEALTH_CHECK_URL"
elif [[ "$ENVIRONMENT" == "production" ]]; then
    BASE_URL="https://jobnaut.com"
else
    BASE_URL="https://staging.jobnaut.com"
fi

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Check if URL is accessible
check_url() {
    local url="$1"
    local expected_status="${2:-200}"
    local description="$3"

    log_check "$description"

    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [[ "$status_code" == "$expected_status" ]]; then
        log_info "✅ $description - Status: $status_code"
        return 0
    else
        log_error "❌ $description - Expected: $expected_status, Got: $status_code"
        return 1
    fi
}

# Check response time
check_response_time() {
    local url="$1"
    local max_time="${2:-2000}" # milliseconds
    local description="$3"

    log_check "$description"

    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url" | awk '{print $1 * 1000}')

    if (( $(echo "$response_time < $max_time" | bc -l) )); then
        log_info "✅ $description - Response time: ${response_time}ms"
        return 0
    else
        log_warn "⚠️  $description - Response time: ${response_time}ms (exceeds ${max_time}ms)"
        return 1
    fi
}

# Check API endpoint with retry
check_api_endpoint() {
    local endpoint="$1"
    local description="$2"
    local retry_count=0

    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if check_url "$endpoint" "200" "$description"; then
            return 0
        fi

        retry_count=$((retry_count + 1))
        if [[ $retry_count -lt $MAX_RETRIES ]]; then
            log_warn "Retry $retry_count/$MAX_RETRIES in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done

    log_error "Failed after $MAX_RETRIES attempts"
    return 1
}

# Check backend health
check_backend() {
    log_info "=== Backend Health Checks ==="

    local backend_url="${BASE_URL}/api"
    local all_passed=true

    # Health endpoint
    if ! check_api_endpoint "${backend_url}/health" "Backend health endpoint"; then
        all_passed=false
    fi

    # Database connectivity
    if ! check_url "${backend_url}/health/db" "200" "Database connectivity"; then
        all_passed=false
    fi

    # Redis connectivity (if applicable)
    check_url "${backend_url}/health/redis" "200" "Redis connectivity" || true

    # API endpoints
    if ! check_url "${backend_url}/jobs" "200" "Jobs API endpoint"; then
        all_passed=false
    fi

    # Response time check
    check_response_time "${backend_url}/health" 1000 "Backend response time" || true

    if [[ "$all_passed" == true ]]; then
        log_info "✅ Backend health checks passed"
        return 0
    else
        log_error "❌ Backend health checks failed"
        return 1
    fi
}

# Check frontend health
check_frontend() {
    log_info "=== Frontend Health Checks ==="

    local all_passed=true

    # Homepage
    if ! check_api_endpoint "$BASE_URL" "Frontend homepage"; then
        all_passed=false
    fi

    # Static assets
    if ! check_url "${BASE_URL}/_nuxt/entry.js" "200" "Frontend assets"; then
        all_passed=false
    fi

    # Response time check
    check_response_time "$BASE_URL" 2000 "Frontend response time" || true

    if [[ "$all_passed" == true ]]; then
        log_info "✅ Frontend health checks passed"
        return 0
    else
        log_error "❌ Frontend health checks failed"
        return 1
    fi
}

# Check SSL certificate
check_ssl() {
    log_info "=== SSL Certificate Check ==="

    local domain
    domain=$(echo "$BASE_URL" | sed 's|https\?://||' | cut -d'/' -f1)

    local expiry_date
    expiry_date=$(echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null | \
                  openssl x509 -noout -enddate 2>/dev/null | cut -d'=' -f2)

    if [[ -n "$expiry_date" ]]; then
        log_info "✅ SSL Certificate valid until: $expiry_date"

        # Check if expiring soon (30 days)
        local expiry_epoch
        expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch
        current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

        if [[ $days_until_expiry -lt 30 ]]; then
            log_warn "⚠️  SSL certificate expires in $days_until_expiry days!"
        fi
        return 0
    else
        log_error "❌ Could not verify SSL certificate"
        return 1
    fi
}

# Check critical services
check_services() {
    log_info "=== Service Status Checks ==="

    # Check if running in Docker
    if command -v docker &> /dev/null; then
        log_check "Docker containers status"
        docker ps --filter "name=jobnaut" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

        # Check container health
        local unhealthy_containers
        unhealthy_containers=$(docker ps --filter "name=jobnaut" --filter "health=unhealthy" -q | wc -l)

        if [[ $unhealthy_containers -gt 0 ]]; then
            log_error "❌ Found $unhealthy_containers unhealthy containers"
            return 1
        else
            log_info "✅ All containers are healthy"
        fi
    fi

    return 0
}

# Monitor metrics (if available)
check_metrics() {
    log_info "=== Metrics Check ==="

    # Check if metrics endpoint is available
    if check_url "${BASE_URL}/api/metrics" "200" "Metrics endpoint" 2>/dev/null; then
        local metrics
        metrics=$(curl -s "${BASE_URL}/api/metrics")

        log_info "Current metrics snapshot:"
        echo "$metrics" | jq '.' 2>/dev/null || echo "$metrics"
    else
        log_warn "Metrics endpoint not available"
    fi
}

# Main health check flow
main() {
    log_info "╔══════════════════════════════════════╗"
    log_info "║   HEALTH CHECK STARTING              ║"
    log_info "╚══════════════════════════════════════╝"
    log_info "Environment: $ENVIRONMENT"
    log_info "Base URL: $BASE_URL"
    log_info "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""

    local exit_code=0

    # Run all health checks
    check_backend || exit_code=1
    echo ""

    check_frontend || exit_code=1
    echo ""

    check_ssl || exit_code=1
    echo ""

    check_services || true  # Don't fail on service checks
    echo ""

    check_metrics || true  # Don't fail on metrics
    echo ""

    # Summary
    log_info "╔══════════════════════════════════════╗"
    if [[ $exit_code -eq 0 ]]; then
        log_info "║   ✅ ALL HEALTH CHECKS PASSED        ║"
    else
        log_error "║   ❌ SOME HEALTH CHECKS FAILED       ║"
    fi
    log_info "╚══════════════════════════════════════╝"

    exit $exit_code
}

# Run main function
main
