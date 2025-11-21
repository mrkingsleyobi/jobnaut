#!/bin/bash

# JobNaut Monitoring Configuration Verification Script
# Tests all monitoring components and configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}JobNaut Monitoring Configuration Verification${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Track results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}: $1"
        ((FAILED++))
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓ PASS${NC}: File exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}: File missing: $1"
        ((FAILED++))
        return 1
    fi
}

check_warning() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
    ((WARNINGS++))
}

# 1. Check monitoring configuration files
echo -e "${BLUE}1. Checking configuration files...${NC}"
check_file "monitoring/prometheus/prometheus.yml"
check_file "monitoring/prometheus/alerts.yml"
check_file "monitoring/alertmanager/config.yml"
check_file "monitoring/grafana/dashboards/application-metrics.json"
check_file "monitoring/grafana/dashboards/business-metrics.json"
check_file "monitoring/grafana/dashboards/infrastructure-metrics.json"
check_file "docker-compose.monitoring.yml"
echo ""

# 2. Validate JSON files
echo -e "${BLUE}2. Validating JSON dashboard files...${NC}"
for dashboard in monitoring/grafana/dashboards/*.json; do
    if [ -f "$dashboard" ]; then
        if python3 -m json.tool "$dashboard" > /dev/null 2>&1; then
            check_success "Valid JSON: $(basename $dashboard)"
        else
            echo -e "${RED}✗ FAIL${NC}: Invalid JSON: $(basename $dashboard)"
            ((FAILED++))
        fi
    fi
done
echo ""

# 3. Check Prometheus configuration
echo -e "${BLUE}3. Checking Prometheus configuration...${NC}"
if grep -q "alerts.yml" monitoring/prometheus/prometheus.yml; then
    check_success "Alert rules referenced in prometheus.yml"
else
    echo -e "${RED}✗ FAIL${NC}: Alert rules not referenced in prometheus.yml"
    ((FAILED++))
fi

if grep -q "jobnaut-api" monitoring/prometheus/prometheus.yml; then
    check_success "JobNaut API scrape job configured"
else
    echo -e "${RED}✗ FAIL${NC}: JobNaut API scrape job not found"
    ((FAILED++))
fi
echo ""

# 4. Check AlertManager receivers
echo -e "${BLUE}4. Checking AlertManager receivers...${NC}"
RECEIVERS=("critical-alerts" "warning-alerts" "database-team" "infrastructure-team" "api-team" "business-team" "ai-team")
for receiver in "${RECEIVERS[@]}"; do
    if grep -q "name: '$receiver'" monitoring/alertmanager/config.yml; then
        check_success "Receiver configured: $receiver"
    else
        echo -e "${RED}✗ FAIL${NC}: Receiver not found: $receiver"
        ((FAILED++))
    fi
done
echo ""

# 5. Check alert rules
echo -e "${BLUE}5. Checking alert rules...${NC}"
ALERTS=("HighErrorRate" "SlowResponseTime" "LowCacheHitRate" "HighMemoryUsage" "ServiceDown")
for alert in "${ALERTS[@]}"; do
    if grep -q "alert: $alert" monitoring/prometheus/alerts.yml; then
        check_success "Alert rule defined: $alert"
    else
        echo -e "${RED}✗ FAIL${NC}: Alert rule not found: $alert"
        ((FAILED++))
    fi
done
echo ""

# 6. Check environment variables
echo -e "${BLUE}6. Checking environment configuration...${NC}"
ENV_VARS=("SLACK_WEBHOOK_URL" "ALERT_EMAIL_TO" "ALERT_EMAIL_FROM" "GRAFANA_ADMIN_USER")
for var in "${ENV_VARS[@]}"; do
    if grep -q "$var" .env.example; then
        check_success "Environment variable documented: $var"
    else
        check_warning "Environment variable not in .env.example: $var"
    fi
done
echo ""

# 7. Check metrics middleware
echo -e "${BLUE}7. Checking metrics middleware...${NC}"
if [ -f "src/middleware/metrics.js" ]; then
    check_success "Metrics middleware exists"

    METRICS=("trackUserRegistration" "trackJobSearch" "trackSavedJob" "trackChatMessage" "trackSkillGapAnalysis")
    for metric in "${METRICS[@]}"; do
        if grep -q "$metric" src/middleware/metrics.js; then
            check_success "Business metric function: $metric"
        else
            echo -e "${RED}✗ FAIL${NC}: Business metric function not found: $metric"
            ((FAILED++))
        fi
    done
else
    echo -e "${RED}✗ FAIL${NC}: Metrics middleware not found"
    ((FAILED++))
fi
echo ""

# 8. Check documentation
echo -e "${BLUE}8. Checking documentation...${NC}"
if [ -f "docs/MONITORING_GUIDE.md" ]; then
    check_success "Monitoring guide exists"

    if grep -q "Accessing Dashboards" docs/MONITORING_GUIDE.md; then
        check_success "Dashboard access documentation"
    fi

    if grep -q "Troubleshooting Guide" docs/MONITORING_GUIDE.md; then
        check_success "Troubleshooting guide included"
    fi

    if grep -q "Alert Management" docs/MONITORING_GUIDE.md; then
        check_success "Alert management documentation"
    fi
else
    echo -e "${RED}✗ FAIL${NC}: Monitoring guide not found"
    ((FAILED++))
fi
echo ""

# 9. Count metrics and alerts
echo -e "${BLUE}9. Counting components...${NC}"
ALERT_COUNT=$(grep -c "alert:" monitoring/prometheus/alerts.yml || echo 0)
DASHBOARD_COUNT=$(ls -1 monitoring/grafana/dashboards/*.json 2>/dev/null | wc -l)
RECEIVER_COUNT=$(grep -c "name: '" monitoring/alertmanager/config.yml || echo 0)

echo -e "  Alert rules: ${GREEN}$ALERT_COUNT${NC}"
echo -e "  Grafana dashboards: ${GREEN}$DASHBOARD_COUNT${NC}"
echo -e "  Alert receivers: ${GREEN}$RECEIVER_COUNT${NC}"
echo ""

# 10. Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo -e "${BLUE}Configuration Summary:${NC}"
    echo "  - $ALERT_COUNT alert rules configured"
    echo "  - $DASHBOARD_COUNT Grafana dashboards ready"
    echo "  - $RECEIVER_COUNT alert receivers configured"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Copy .env.example to .env and configure alert notifications:"
    echo "   - SLACK_WEBHOOK_URL for Slack alerts"
    echo "   - Email settings (ALERT_EMAIL_TO, SMTP_*)"
    echo "   - Optional: PAGERDUTY_SERVICE_KEY"
    echo ""
    echo "2. Start monitoring stack:"
    echo "   docker compose -f docker-compose.monitoring.yml up -d"
    echo ""
    echo "3. Access monitoring interfaces:"
    echo "   - Grafana: http://localhost:3002 (admin/admin)"
    echo "   - Prometheus: http://localhost:9090"
    echo "   - AlertManager: http://localhost:9093"
    echo ""
    echo "4. Review comprehensive documentation:"
    echo "   docs/MONITORING_GUIDE.md"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
