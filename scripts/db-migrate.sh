#!/bin/bash

##############################################################################
# JobNaut Database Migration Script
#
# This script handles database migrations with safety checks and rollback
#
# Usage: ./db-migrate.sh [staging|production] [up|down|status]
#
# Required Environment Variables:
#   DATABASE_URL - PostgreSQL connection string
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
MIGRATION_ACTION="${2:-up}"
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Validate migration action
if [[ ! "$MIGRATION_ACTION" =~ ^(up|down|status)$ ]]; then
    log_error "Invalid action. Use 'up', 'down', or 'status'"
    exit 1
fi

# Check required environment variables
if [[ -z "${DATABASE_URL:-}" ]]; then
    log_error "DATABASE_URL environment variable is required"
    exit 1
fi

# Confirmation for production
if [[ "$ENVIRONMENT" == "production" && "$MIGRATION_ACTION" != "status" ]]; then
    log_warn "⚠️  WARNING: Running migrations on PRODUCTION database!"

    if [[ -z "${CI:-}" ]]; then
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Migration cancelled by user"
            exit 0
        fi
    fi
fi

# Create database backup
create_backup() {
    log_step "Creating database backup before migration"

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$PROJECT_ROOT/backups/db"
    local backup_file="$backup_dir/backup_${ENVIRONMENT}_${timestamp}.sql"

    mkdir -p "$backup_dir"

    # Extract database connection info
    local db_host db_port db_name db_user
    db_host=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    db_port=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    db_user=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

    log_info "Creating backup: $backup_file"

    # Create backup using pg_dump (if PostgreSQL)
    if command -v pg_dump &> /dev/null; then
        PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
        pg_dump -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
            --no-owner --no-acl -F p -f "$backup_file"

        log_info "✅ Backup created successfully"
        echo "$backup_file" > "$backup_dir/.latest_backup"
    else
        log_warn "pg_dump not available, skipping backup"
    fi
}

# Check migration status
check_migration_status() {
    log_step "Checking migration status"

    cd "$PROJECT_ROOT"

    # Use Prisma to check migration status
    if command -v npx &> /dev/null && [[ -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
        npx prisma migrate status || true
    else
        log_warn "Prisma CLI not available"
    fi
}

# Run migrations up
run_migrations_up() {
    log_step "Running database migrations (up)"

    cd "$PROJECT_ROOT"

    # Create backup before migration
    if [[ "$ENVIRONMENT" == "production" ]]; then
        create_backup
    fi

    # Check current status
    check_migration_status

    # Run Prisma migrations
    if [[ -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
        log_info "Applying Prisma migrations..."

        # Generate Prisma client
        npx prisma generate

        # Deploy migrations
        npx prisma migrate deploy

        log_info "✅ Migrations applied successfully"
    else
        log_error "Prisma schema not found at $PROJECT_ROOT/prisma/schema.prisma"
        exit 1
    fi
}

# Run migrations down (rollback)
run_migrations_down() {
    log_step "Rolling back database migrations"

    log_warn "⚠️  Database rollback requested"
    log_warn "Note: Prisma does not support automatic rollback"
    log_warn "You need to manually restore from backup or create a new migration"

    # List available backups
    local backup_dir="$PROJECT_ROOT/backups/db"
    if [[ -d "$backup_dir" ]]; then
        log_info "Available backups:"
        ls -lht "$backup_dir"/*.sql 2>/dev/null || log_warn "No backups found"

        if [[ -f "$backup_dir/.latest_backup" ]]; then
            local latest_backup
            latest_backup=$(cat "$backup_dir/.latest_backup")
            log_info "Latest backup: $latest_backup"

            if [[ -z "${CI:-}" ]]; then
                read -p "Do you want to restore from latest backup? (yes/no): " -r
                if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                    restore_from_backup "$latest_backup"
                fi
            fi
        fi
    fi
}

# Restore from backup
restore_from_backup() {
    local backup_file="$1"

    log_step "Restoring database from backup: $backup_file"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    # Extract database connection info
    local db_host db_port db_name db_user
    db_host=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    db_port=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    db_user=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

    if command -v psql &> /dev/null; then
        PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
        psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -f "$backup_file"

        log_info "✅ Database restored successfully"
    else
        log_error "psql not available, cannot restore backup"
        exit 1
    fi
}

# Verify database connection
verify_connection() {
    log_step "Verifying database connection"

    cd "$PROJECT_ROOT"

    if npx prisma db execute --stdin <<< "SELECT 1;" &>/dev/null; then
        log_info "✅ Database connection successful"
        return 0
    else
        log_error "❌ Database connection failed"
        return 1
    fi
}

# Post-migration checks
post_migration_checks() {
    log_step "Running post-migration checks"

    # Verify connection
    if ! verify_connection; then
        log_error "Database connection check failed after migration"
        return 1
    fi

    # Check migration status
    check_migration_status

    log_info "✅ Post-migration checks completed"
}

# Main migration flow
main() {
    log_info "╔══════════════════════════════════════╗"
    log_info "║   DATABASE MIGRATION                 ║"
    log_info "╚══════════════════════════════════════╝"
    log_info "Environment: $ENVIRONMENT"
    log_info "Action: $MIGRATION_ACTION"
    log_info "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""

    # Verify connection first
    if ! verify_connection; then
        log_error "Cannot proceed with migration - database connection failed"
        exit 1
    fi

    case "$MIGRATION_ACTION" in
        up)
            run_migrations_up
            post_migration_checks
            ;;
        down)
            run_migrations_down
            ;;
        status)
            check_migration_status
            ;;
    esac

    log_info "╔══════════════════════════════════════╗"
    log_info "║   MIGRATION COMPLETED                ║"
    log_info "╚══════════════════════════════════════╝"
}

# Run main function
main
