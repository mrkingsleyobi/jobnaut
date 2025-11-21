#!/bin/bash

##############################################################################
# JobNaut Rollback Script
#
# This script handles rollback of JobNaut application to previous version
#
# Usage: ./rollback.sh [staging|production] [version]
#
# Required Environment Variables:
#   DEPLOY_HOST     - Target deployment host
#   DEPLOY_USER     - SSH user for deployment
#   DEPLOY_KEY      - SSH private key (optional)
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
TARGET_VERSION="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

log_warn "=== INITIATING ROLLBACK ==="
log_info "Environment: $ENVIRONMENT"

# Validate required environment variables
required_vars=("DEPLOY_HOST" "DEPLOY_USER")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Confirmation for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_warn "⚠️  WARNING: Rolling back PRODUCTION environment!"
    log_warn "This will revert the application to the previous version."

    if [[ -z "${CI:-}" ]]; then
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
fi

# Setup SSH
setup_ssh() {
    log_step "Setting up SSH connection"

    mkdir -p ~/.ssh
    chmod 700 ~/.ssh

    if [[ -n "${DEPLOY_KEY:-}" ]]; then
        echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        export SSH_KEY_PATH=~/.ssh/deploy_key
    else
        export SSH_KEY_PATH=~/.ssh/id_rsa
    fi

    ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
}

# Get previous version
get_previous_version() {
    log_step "Retrieving previous version information"

    if [[ -n "$TARGET_VERSION" ]]; then
        ROLLBACK_VERSION="$TARGET_VERSION"
        log_info "Using specified version: $ROLLBACK_VERSION"
    else
        # Get version from remote server
        ROLLBACK_VERSION=$(ssh -i "$SSH_KEY_PATH" "${DEPLOY_USER}@${DEPLOY_HOST}" \
            "cat /opt/jobnaut/.previous_version 2>/dev/null || echo ''")

        if [[ -z "$ROLLBACK_VERSION" ]]; then
            log_error "No previous version found. Cannot perform rollback."
            log_error "Please specify a version manually: ./rollback.sh $ENVIRONMENT <version>"
            exit 1
        fi

        log_info "Found previous version: $ROLLBACK_VERSION"
    fi
}

# Create backup of current state
create_backup() {
    log_step "Creating backup of current state"

    ssh -i "$SSH_KEY_PATH" "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
        set -e
        cd /opt/jobnaut

        # Create backup directory
        BACKUP_DIR="/opt/jobnaut/backups/\$(date +%Y%m%d_%H%M%S)"
        mkdir -p "\$BACKUP_DIR"

        # Backup current version info
        docker-compose ps > "\$BACKUP_DIR/containers.txt" || true
        docker images | grep jobnaut > "\$BACKUP_DIR/images.txt" || true

        echo "Backup created at \$BACKUP_DIR"
EOF
}

# Perform rollback
perform_rollback() {
    log_step "Rolling back to version: $ROLLBACK_VERSION"

    ssh -i "$SSH_KEY_PATH" "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
        set -e
        cd /opt/jobnaut

        echo "Pulling rollback images..."
        docker pull ghcr.io/jobnaut/jobnaut-backend:${ROLLBACK_VERSION}
        docker pull ghcr.io/jobnaut/jobnaut-frontend:${ROLLBACK_VERSION}

        # Update environment
        export BACKEND_IMAGE=ghcr.io/jobnaut/jobnaut-backend:${ROLLBACK_VERSION}
        export FRONTEND_IMAGE=ghcr.io/jobnaut/jobnaut-frontend:${ROLLBACK_VERSION}

        echo "Stopping current containers..."
        docker-compose down

        echo "Starting containers with version ${ROLLBACK_VERSION}..."
        docker-compose up -d

        # Wait for health checks
        echo "Waiting for containers to be healthy..."
        timeout 300 bash -c 'until docker-compose ps | grep -q "healthy"; do sleep 5; done'

        echo "Rollback completed successfully!"
EOF

    if [[ $? -eq 0 ]]; then
        log_info "✅ Rollback successful"
        return 0
    else
        log_error "❌ Rollback failed"
        return 1
    fi
}

# Run health checks
run_health_checks() {
    log_step "Running health checks on rolled back version"

    if [[ -f "$SCRIPT_DIR/health-check.sh" ]]; then
        bash "$SCRIPT_DIR/health-check.sh" "$ENVIRONMENT"
        return $?
    else
        log_warn "Health check script not found, skipping health checks"
        return 0
    fi
}

# Rollback database migrations (optional)
rollback_database() {
    log_step "Checking database migration rollback requirements"

    # This is a placeholder - actual implementation depends on your migration strategy
    log_warn "Database rollback must be performed manually if needed"
    log_info "Check your migration history and rollback if necessary"
}

# Main rollback flow
main() {
    log_warn "╔══════════════════════════════════════╗"
    log_warn "║    ROLLBACK PROCEDURE INITIATED      ║"
    log_warn "╚══════════════════════════════════════╝"

    setup_ssh
    get_previous_version
    create_backup

    if ! perform_rollback; then
        log_error "Rollback failed! Manual intervention required."
        exit 1
    fi

    run_health_checks
    rollback_database

    log_info "╔══════════════════════════════════════╗"
    log_info "║     ROLLBACK COMPLETED SUCCESSFULLY  ║"
    log_info "╚══════════════════════════════════════╝"
    log_info "Environment: $ENVIRONMENT"
    log_info "Rolled back to version: $ROLLBACK_VERSION"
    log_info ""
    log_warn "⚠️  Don't forget to:"
    log_warn "   1. Notify the team about the rollback"
    log_warn "   2. Investigate the root cause of the issue"
    log_warn "   3. Update incident documentation"
    log_warn "   4. Check if database rollback is needed"
}

# Run main function
main
