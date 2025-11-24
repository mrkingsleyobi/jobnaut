#!/bin/bash

##############################################################################
# JobNaut Deployment Script
#
# This script handles deployment of JobNaut application to staging/production
#
# Usage: ./deploy.sh [staging|production]
#
# Required Environment Variables:
#   DEPLOY_HOST     - Target deployment host
#   DEPLOY_USER     - SSH user for deployment
#   DEPLOY_KEY      - SSH private key
#   IMAGE_TAG       - Docker image tag to deploy
##############################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT environment"

# Validate required environment variables
required_vars=("DEPLOY_HOST" "DEPLOY_USER" "IMAGE_TAG")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Setup SSH
setup_ssh() {
    log_info "Setting up SSH connection"

    mkdir -p ~/.ssh
    chmod 700 ~/.ssh

    if [[ -n "${DEPLOY_KEY:-}" ]]; then
        echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        export SSH_KEY_PATH=~/.ssh/deploy_key
    else
        export SSH_KEY_PATH=~/.ssh/id_rsa
    fi

    # Add host to known_hosts
    ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
}

# Deploy Docker containers
deploy_containers() {
    log_info "Deploying Docker containers to $DEPLOY_HOST"

    ssh -i "$SSH_KEY_PATH" "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
        set -e

        # Navigate to application directory
        cd /opt/jobnaut || exit 1

        # Store current version for rollback
        echo "$IMAGE_TAG" > .previous_version

        # Pull latest images
        echo "Pulling Docker images..."
        docker pull ghcr.io/jobnaut/jobnaut-backend:${IMAGE_TAG}
        docker pull ghcr.io/jobnaut/jobnaut-frontend:${IMAGE_TAG}

        # Update docker-compose environment
        export BACKEND_IMAGE=ghcr.io/jobnaut/jobnaut-backend:${IMAGE_TAG}
        export FRONTEND_IMAGE=ghcr.io/jobnaut/jobnaut-frontend:${IMAGE_TAG}

        # Stop existing containers
        echo "Stopping existing containers..."
        docker-compose down --remove-orphans

        # Start new containers
        echo "Starting new containers..."
        docker-compose up -d

        # Wait for containers to be healthy
        echo "Waiting for containers to be healthy..."
        timeout 300 bash -c 'until docker-compose ps | grep -q "healthy"; do sleep 5; done'

        # Clean up old images
        echo "Cleaning up old images..."
        docker image prune -f

        echo "Deployment completed successfully!"
EOF

    if [[ $? -eq 0 ]]; then
        log_info "Container deployment successful"
        return 0
    else
        log_error "Container deployment failed"
        return 1
    fi
}

# Tag current deployment
tag_deployment() {
    log_info "Tagging deployment with version $IMAGE_TAG"

    # Create git tag if not exists
    if ! git rev-parse "$IMAGE_TAG" >/dev/null 2>&1; then
        git tag -a "$IMAGE_TAG" -m "Deployment to $ENVIRONMENT on $(date)"
        git push origin "$IMAGE_TAG" || true
    fi
}

# Main deployment flow
main() {
    log_info "=== JobNaut Deployment ==="
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Deploy Host: $DEPLOY_HOST"

    setup_ssh

    if ! deploy_containers; then
        log_error "Deployment failed!"
        exit 1
    fi

    tag_deployment

    log_info "=== Deployment Complete ==="
    log_info "Version $IMAGE_TAG deployed to $ENVIRONMENT successfully"
}

# Run main function
main
