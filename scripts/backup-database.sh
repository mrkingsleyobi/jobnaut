#!/bin/bash
# PostgreSQL Backup Script for JobNaut
# Performs automated database backups with compression, rotation, and cloud upload
# Version: 1.0.0

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/../config/backup.config.js}"

# Default configuration (can be overridden by environment variables)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jobnaut/postgresql}"
S3_BUCKET="${S3_BUCKET:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-jobnaut}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-9}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="${LOG_FILE:-/var/log/jobnaut-backup.log}"
VERIFY_BACKUP="${VERIFY_BACKUP:-true}"
BACKUP_TYPE="${BACKUP_TYPE:-full}"  # full, schema, data

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="jobnaut_db_${BACKUP_TYPE}_${TIMESTAMP}.sql"
BACKUP_ARCHIVE="${BACKUP_FILENAME}.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_ARCHIVE}"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $@"
    log "INFO" "$@"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $@"
    log "WARN" "$@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
    log "ERROR" "$@"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    # Email notification
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "JobNaut Backup ${status}" "$NOTIFICATION_EMAIL"
    fi

    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ] && command -v curl >/dev/null 2>&1; then
        local color="good"
        [ "$status" = "FAILED" ] && color="danger"

        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"JobNaut Database Backup ${status}\",
                    \"text\": \"$message\",
                    \"footer\": \"JobNaut Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" >/dev/null 2>&1 || log_warn "Failed to send Slack notification"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if pg_dump is available
    if ! command -v pg_dump >/dev/null 2>&1; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check if gzip is available
    if ! command -v gzip >/dev/null 2>&1; then
        log_error "gzip not found. Please install gzip."
        exit 1
    fi

    # Create backup directory if it doesn't exist
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi

    # Check disk space (require at least 1GB free)
    local available_space=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 1 ]; then
        log_error "Insufficient disk space. Available: ${available_space}GB, Required: 1GB"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Perform database backup
perform_backup() {
    log_info "Starting ${BACKUP_TYPE} database backup..."
    log_info "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log_info "Backup file: ${BACKUP_PATH}"

    local start_time=$(date +%s)

    # Build pg_dump command based on backup type
    local pg_dump_cmd="pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER"

    case "$BACKUP_TYPE" in
        full)
            pg_dump_cmd="$pg_dump_cmd -Fp -b -v"
            ;;
        schema)
            pg_dump_cmd="$pg_dump_cmd -Fp -s -v"
            ;;
        data)
            pg_dump_cmd="$pg_dump_cmd -Fp -a -v"
            ;;
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            exit 1
            ;;
    esac

    # Execute backup with compression
    if PGPASSWORD="$PGPASSWORD" $pg_dump_cmd "$DB_NAME" | gzip -"$COMPRESSION_LEVEL" > "$BACKUP_PATH"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local size=$(du -h "$BACKUP_PATH" | cut -f1)

        log_info "Backup completed successfully"
        log_info "Duration: ${duration}s"
        log_info "Size: $size"

        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    if [ "$VERIFY_BACKUP" != "true" ]; then
        log_info "Backup verification skipped"
        return 0
    fi

    log_info "Verifying backup integrity..."

    # Test gzip integrity
    if gzip -t "$BACKUP_PATH" 2>/dev/null; then
        log_info "Backup archive integrity verified"

        # Check if file size is reasonable (> 1KB)
        local size=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH")
        if [ "$size" -lt 1024 ]; then
            log_error "Backup file size too small: ${size} bytes"
            return 1
        fi

        return 0
    else
        log_error "Backup archive is corrupted"
        return 1
    fi
}

# Upload to cloud storage (S3)
upload_to_cloud() {
    if [ -z "$S3_BUCKET" ]; then
        log_info "Cloud upload skipped (S3_BUCKET not configured)"
        return 0
    fi

    if ! command -v aws >/dev/null 2>&1; then
        log_warn "AWS CLI not found. Skipping cloud upload."
        return 0
    fi

    log_info "Uploading backup to S3: s3://${S3_BUCKET}/backups/postgresql/${BACKUP_ARCHIVE}"

    if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/backups/postgresql/${BACKUP_ARCHIVE}" \
        --storage-class STANDARD_IA \
        --metadata "backup-type=$BACKUP_TYPE,timestamp=$TIMESTAMP,database=$DB_NAME"; then
        log_info "Cloud upload completed successfully"
        return 0
    else
        log_error "Cloud upload failed"
        return 1
    fi
}

# Rotate old backups
rotate_backups() {
    log_info "Rotating backups older than ${RETENTION_DAYS} days..."

    local deleted_count=0

    # Find and delete old backups
    while IFS= read -r old_backup; do
        log_info "Deleting old backup: $(basename "$old_backup")"
        rm -f "$old_backup"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "jobnaut_db_*.sql.gz" -type f -mtime +$RETENTION_DAYS)

    if [ $deleted_count -gt 0 ]; then
        log_info "Deleted $deleted_count old backup(s)"
    else
        log_info "No old backups to delete"
    fi

    # Also rotate old backups from S3 if configured
    if [ -n "$S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        log_info "Rotating old backups from S3..."
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)

        aws s3 ls "s3://${S3_BUCKET}/backups/postgresql/" | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')

            if [[ "$file_date" < "$cutoff_date" ]]; then
                log_info "Deleting old S3 backup: $file_name"
                aws s3 rm "s3://${S3_BUCKET}/backups/postgresql/$file_name" || true
            fi
        done
    fi
}

# Generate backup report
generate_report() {
    local status=$1
    local backup_size=$(du -h "$BACKUP_PATH" 2>/dev/null | cut -f1 || echo "N/A")
    local backup_count=$(find "$BACKUP_DIR" -name "jobnaut_db_*.sql.gz" -type f | wc -l)

    cat <<EOF

==================================================
JobNaut Database Backup Report
==================================================
Status:           $status
Timestamp:        $(date '+%Y-%m-%d %H:%M:%S')
Backup Type:      $BACKUP_TYPE
Database:         ${DB_NAME}@${DB_HOST}:${DB_PORT}
Backup File:      $BACKUP_ARCHIVE
Backup Size:      $backup_size
Total Backups:    $backup_count
Retention:        ${RETENTION_DAYS} days
Cloud Upload:     $([ -n "$S3_BUCKET" ] && echo "Enabled (S3)" || echo "Disabled")
==================================================

EOF
}

# Cleanup on failure
cleanup_failed_backup() {
    log_warn "Cleaning up failed backup..."
    if [ -f "$BACKUP_PATH" ]; then
        rm -f "$BACKUP_PATH"
        log_info "Removed incomplete backup file"
    fi
}

# Main execution
main() {
    log_info "=========================================="
    log_info "JobNaut Database Backup Started"
    log_info "=========================================="

    local overall_status="SUCCESS"

    # Trap errors and cleanup
    trap 'cleanup_failed_backup; exit 1' ERR

    # Execute backup workflow
    check_prerequisites

    if perform_backup; then
        if verify_backup; then
            upload_to_cloud || log_warn "Cloud upload failed, but local backup is available"
            rotate_backups
        else
            overall_status="FAILED"
            log_error "Backup verification failed"
            cleanup_failed_backup
        fi
    else
        overall_status="FAILED"
        log_error "Backup creation failed"
        cleanup_failed_backup
    fi

    # Generate and display report
    local report=$(generate_report "$overall_status")
    echo "$report"
    echo "$report" >> "$LOG_FILE"

    # Send notification
    send_notification "$overall_status" "$report"

    if [ "$overall_status" = "SUCCESS" ]; then
        log_info "=========================================="
        log_info "JobNaut Database Backup Completed Successfully"
        log_info "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "JobNaut Database Backup Failed"
        log_error "=========================================="
        exit 1
    fi
}

# Run main function
main "$@"
