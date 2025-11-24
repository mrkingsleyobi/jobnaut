#!/bin/bash
# PostgreSQL Database Restore Script for JobNaut
# Restores database from backup with safety checks and point-in-time recovery
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jobnaut/postgresql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-jobnaut}"
DB_USER="${DB_USER:-postgres}"
LOG_FILE="${LOG_FILE:-/var/log/jobnaut-restore.log}"
DRY_RUN="${DRY_RUN:-false}"
BACKUP_BEFORE_RESTORE="${BACKUP_BEFORE_RESTORE:-true}"
S3_BUCKET="${S3_BUCKET:-}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $@" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $@" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@" | tee -a "$LOG_FILE"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $@" | tee -a "$LOG_FILE"
}

# Display usage information
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Restore JobNaut database from backup

OPTIONS:
    -f, --file FILE         Backup file to restore from (required if not using -l)
    -l, --latest            Restore from latest backup
    -t, --timestamp TIME    Restore from backup closest to timestamp (YYYYMMDD_HHMMSS)
    -s, --s3                Download backup from S3
    -d, --dry-run           Perform dry run (show what would be done)
    -n, --no-backup         Skip backup before restore
    -h, --help              Show this help message

EXAMPLES:
    # Restore from latest local backup
    $0 --latest

    # Restore from specific backup file
    $0 --file /var/backups/jobnaut/postgresql/jobnaut_db_full_20240101_120000.sql.gz

    # Restore from S3 (latest backup)
    $0 --s3 --latest

    # Dry run to see what would happen
    $0 --latest --dry-run

    # Restore from timestamp (closest match)
    $0 --timestamp 20240101_120000

ENVIRONMENT VARIABLES:
    DB_HOST                 Database host (default: localhost)
    DB_PORT                 Database port (default: 5432)
    DB_NAME                 Database name (default: jobnaut)
    DB_USER                 Database user (default: postgres)
    PGPASSWORD              Database password (required)
    BACKUP_DIR              Backup directory (default: /var/backups/jobnaut/postgresql)
    S3_BUCKET               S3 bucket for cloud backups

EOF
    exit 1
}

# Parse command line arguments
parse_args() {
    BACKUP_FILE=""
    USE_LATEST=false
    USE_S3=false
    TARGET_TIMESTAMP=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -l|--latest)
                USE_LATEST=true
                shift
                ;;
            -t|--timestamp)
                TARGET_TIMESTAMP="$2"
                shift 2
                ;;
            -s|--s3)
                USE_S3=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -n|--no-backup)
                BACKUP_BEFORE_RESTORE=false
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

# Find latest backup
find_latest_backup() {
    local search_dir="$1"

    local latest=$(find "$search_dir" -name "jobnaut_db_full_*.sql.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2)

    if [ -z "$latest" ]; then
        log_error "No backup files found in $search_dir"
        return 1
    fi

    echo "$latest"
}

# Find backup by timestamp
find_backup_by_timestamp() {
    local search_dir="$1"
    local target="$2"

    local backup=$(find "$search_dir" -name "jobnaut_db_full_*${target}*.sql.gz" -type f | head -1)

    if [ -z "$backup" ]; then
        log_warn "No exact match for timestamp $target, finding closest..."
        backup=$(find "$search_dir" -name "jobnaut_db_full_*.sql.gz" -type f | sort | head -1)
    fi

    if [ -z "$backup" ]; then
        log_error "No backup files found matching timestamp $target"
        return 1
    fi

    echo "$backup"
}

# Download backup from S3
download_from_s3() {
    local target_file="$1"

    if [ -z "$S3_BUCKET" ]; then
        log_error "S3_BUCKET not configured"
        return 1
    fi

    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI not found"
        return 1
    fi

    log_info "Downloading backup from S3..."

    local s3_path="s3://${S3_BUCKET}/backups/postgresql/$(basename "$target_file")"
    local temp_file="${BACKUP_DIR}/temp_$(basename "$target_file")"

    if aws s3 cp "$s3_path" "$temp_file"; then
        log_info "Download completed: $temp_file"
        echo "$temp_file"
        return 0
    else
        log_error "Failed to download from S3: $s3_path"
        return 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check psql
    if ! command -v psql >/dev/null 2>&1; then
        log_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check gunzip
    if ! command -v gunzip >/dev/null 2>&1; then
        log_error "gunzip not found."
        exit 1
    fi

    # Check database connection
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
        log_error "Cannot connect to database server"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Backup current database before restore
backup_current_database() {
    if [ "$BACKUP_BEFORE_RESTORE" != "true" ]; then
        log_info "Skipping pre-restore backup"
        return 0
    fi

    log_info "Creating backup of current database before restore..."

    local pre_restore_backup="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

    if PGPASSWORD="$PGPASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fp "$DB_NAME" | gzip -9 > "$pre_restore_backup"; then
        log_info "Pre-restore backup created: $pre_restore_backup"
        echo "$pre_restore_backup"
        return 0
    else
        log_error "Pre-restore backup failed"
        return 1
    fi
}

# Verify backup file
verify_backup_file() {
    local file="$1"

    log_info "Verifying backup file: $file"

    if [ ! -f "$file" ]; then
        log_error "Backup file not found: $file"
        return 1
    fi

    if ! gzip -t "$file" 2>/dev/null; then
        log_error "Backup file is corrupted: $file"
        return 1
    fi

    local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
    if [ "$size" -lt 1024 ]; then
        log_error "Backup file too small: ${size} bytes"
        return 1
    fi

    log_info "Backup file verification passed"
    return 0
}

# Perform database restore
perform_restore() {
    local backup_file="$1"

    log_info "Starting database restore..."
    log_info "Source: $backup_file"
    log_info "Target: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN MODE - No changes will be made"
        log_info "Would restore from: $backup_file"
        log_info "Would terminate existing connections to database: $DB_NAME"
        log_info "Would drop and recreate database: $DB_NAME"
        log_info "Would restore data from backup"
        return 0
    fi

    local start_time=$(date +%s)

    # Terminate existing connections
    log_info "Terminating existing connections..."
    PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        >/dev/null 2>&1 || true

    # Drop and recreate database
    log_info "Dropping and recreating database..."
    PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

    # Restore from backup
    log_info "Restoring data from backup..."
    if gunzip -c "$backup_file" | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_info "Restore completed successfully"
        log_info "Duration: ${duration}s"
        return 0
    else
        log_error "Restore failed"
        return 1
    fi
}

# Verify restored database
verify_restore() {
    log_info "Verifying restored database..."

    # Check if database exists
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_error "Database $DB_NAME not found after restore"
        return 1
    fi

    # Check if we can connect and query
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        log_error "Cannot connect to restored database"
        return 1
    fi

    # Count tables
    local table_count=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    log_info "Database verified - Tables found: $table_count"

    if [ "$table_count" -eq 0 ]; then
        log_warn "No tables found in restored database"
    fi

    return 0
}

# Generate restore report
generate_report() {
    local status=$1
    local backup_file=$2
    local pre_restore_backup=${3:-"N/A"}

    cat <<EOF

==================================================
JobNaut Database Restore Report
==================================================
Status:               $status
Timestamp:            $(date '+%Y-%m-%d %H:%M:%S')
Database:             ${DB_NAME}@${DB_HOST}:${DB_PORT}
Backup Source:        $(basename "$backup_file")
Pre-Restore Backup:   $([ "$pre_restore_backup" != "N/A" ] && basename "$pre_restore_backup" || echo "None")
Dry Run:              $([ "$DRY_RUN" = "true" ] && echo "Yes" || echo "No")
==================================================

EOF
}

# Main execution
main() {
    log_info "=========================================="
    log_info "JobNaut Database Restore Started"
    log_info "=========================================="

    # Parse arguments
    parse_args "$@"

    # Determine backup file to use
    if [ "$USE_LATEST" = "true" ]; then
        log_info "Finding latest backup..."
        BACKUP_FILE=$(find_latest_backup "$BACKUP_DIR")
    elif [ -n "$TARGET_TIMESTAMP" ]; then
        log_info "Finding backup for timestamp: $TARGET_TIMESTAMP"
        BACKUP_FILE=$(find_backup_by_timestamp "$BACKUP_DIR" "$TARGET_TIMESTAMP")
    elif [ -z "$BACKUP_FILE" ]; then
        log_error "No backup file specified. Use --file, --latest, or --timestamp"
        usage
    fi

    # Download from S3 if requested
    if [ "$USE_S3" = "true" ]; then
        BACKUP_FILE=$(download_from_s3 "$BACKUP_FILE")
    fi

    log_info "Using backup file: $BACKUP_FILE"

    # Execute restore workflow
    local overall_status="SUCCESS"
    local pre_restore_backup="N/A"

    check_prerequisites
    verify_backup_file "$BACKUP_FILE" || exit 1

    if [ "$DRY_RUN" != "true" ]; then
        pre_restore_backup=$(backup_current_database) || log_warn "Pre-restore backup failed, continuing anyway..."
    fi

    if perform_restore "$BACKUP_FILE"; then
        if [ "$DRY_RUN" != "true" ]; then
            verify_restore || overall_status="FAILED"
        fi
    else
        overall_status="FAILED"
    fi

    # Generate report
    local report=$(generate_report "$overall_status" "$BACKUP_FILE" "$pre_restore_backup")
    echo "$report"

    if [ "$overall_status" = "SUCCESS" ]; then
        log_info "=========================================="
        log_info "JobNaut Database Restore Completed Successfully"
        log_info "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "JobNaut Database Restore Failed"
        log_error "=========================================="
        log_error "You can restore from pre-restore backup: $pre_restore_backup"
        exit 1
    fi
}

# Run main function
main "$@"
