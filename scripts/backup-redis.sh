#!/bin/bash
# Redis Backup Script for JobNaut
# Performs automated Redis backups (RDB and AOF)
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jobnaut/redis}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/jobnaut-redis-backup.log}"
BACKUP_TYPE="${BACKUP_TYPE:-both}"  # rdb, aof, or both

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if redis-cli is available
    if ! command -v redis-cli >/dev/null 2>&1; then
        log_error "redis-cli not found. Please install Redis tools."
        exit 1
    fi

    # Create backup directory
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi

    # Check Redis connection
    local auth_cmd=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_cmd="-a $REDIS_PASSWORD"
    fi

    if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_cmd PING >/dev/null 2>&1; then
        log_error "Cannot connect to Redis at ${REDIS_HOST}:${REDIS_PORT}"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Backup RDB file
backup_rdb() {
    log_info "Starting RDB backup..."

    local auth_cmd=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_cmd="-a $REDIS_PASSWORD"
    fi

    # Trigger BGSAVE
    log_info "Triggering Redis BGSAVE..."
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_cmd BGSAVE >/dev/null

    # Wait for BGSAVE to complete
    log_info "Waiting for BGSAVE to complete..."
    local max_wait=300  # 5 minutes max
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local save_status=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_cmd LASTSAVE)
        sleep 2
        local new_save_status=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_cmd LASTSAVE)

        if [ "$new_save_status" != "$save_status" ]; then
            log_info "BGSAVE completed"
            break
        fi

        waited=$((waited + 2))
    done

    if [ $waited -ge $max_wait ]; then
        log_error "BGSAVE timeout"
        return 1
    fi

    # Copy RDB file
    local rdb_file="${REDIS_DATA_DIR}/dump.rdb"
    local backup_file="${BACKUP_DIR}/redis_dump_${TIMESTAMP}.rdb"

    if [ -f "$rdb_file" ]; then
        cp "$rdb_file" "$backup_file"
        gzip "$backup_file"
        log_info "RDB backup created: ${backup_file}.gz"

        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log_info "RDB backup size: $size"

        return 0
    else
        log_error "RDB file not found: $rdb_file"
        return 1
    fi
}

# Backup AOF file
backup_aof() {
    log_info "Starting AOF backup..."

    local aof_file="${REDIS_DATA_DIR}/appendonly.aof"
    local backup_file="${BACKUP_DIR}/redis_appendonly_${TIMESTAMP}.aof"

    if [ -f "$aof_file" ]; then
        cp "$aof_file" "$backup_file"
        gzip "$backup_file"
        log_info "AOF backup created: ${backup_file}.gz"

        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log_info "AOF backup size: $size"

        return 0
    else
        log_warn "AOF file not found: $aof_file (AOF may not be enabled)"
        return 0
    fi
}

# Upload to S3
upload_to_cloud() {
    if [ -z "$S3_BUCKET" ]; then
        log_info "Cloud upload skipped (S3_BUCKET not configured)"
        return 0
    fi

    if ! command -v aws >/dev/null 2>&1; then
        log_warn "AWS CLI not found. Skipping cloud upload."
        return 0
    fi

    log_info "Uploading backups to S3..."

    local uploaded=0
    for backup_file in "${BACKUP_DIR}"/redis_*_${TIMESTAMP}.*.gz; do
        if [ -f "$backup_file" ]; then
            local s3_path="s3://${S3_BUCKET}/backups/redis/$(basename "$backup_file")"
            log_info "Uploading $(basename "$backup_file") to S3..."

            if aws s3 cp "$backup_file" "$s3_path" --storage-class STANDARD_IA; then
                ((uploaded++))
            else
                log_error "Failed to upload $(basename "$backup_file")"
            fi
        fi
    done

    log_info "Uploaded $uploaded file(s) to S3"
    return 0
}

# Rotate old backups
rotate_backups() {
    log_info "Rotating backups older than ${RETENTION_DAYS} days..."

    local deleted_count=0

    while IFS= read -r old_backup; do
        log_info "Deleting old backup: $(basename "$old_backup")"
        rm -f "$old_backup"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "redis_*.gz" -type f -mtime +$RETENTION_DAYS)

    if [ $deleted_count -gt 0 ]; then
        log_info "Deleted $deleted_count old backup(s)"
    else
        log_info "No old backups to delete"
    fi
}

# Generate report
generate_report() {
    local status=$1
    local backup_count=$(find "$BACKUP_DIR" -name "redis_*_${TIMESTAMP}.*.gz" -type f 2>/dev/null | wc -l)

    cat <<EOF

==================================================
JobNaut Redis Backup Report
==================================================
Status:           $status
Timestamp:        $(date '+%Y-%m-%d %H:%M:%S')
Backup Type:      $BACKUP_TYPE
Redis:            ${REDIS_HOST}:${REDIS_PORT}
Files Created:    $backup_count
Backup Location:  $BACKUP_DIR
Retention:        ${RETENTION_DAYS} days
Cloud Upload:     $([ -n "$S3_BUCKET" ] && echo "Enabled (S3)" || echo "Disabled")
==================================================

EOF
}

# Main execution
main() {
    log_info "=========================================="
    log_info "JobNaut Redis Backup Started"
    log_info "=========================================="

    local overall_status="SUCCESS"

    check_prerequisites

    # Perform backup based on type
    case "$BACKUP_TYPE" in
        rdb)
            backup_rdb || overall_status="FAILED"
            ;;
        aof)
            backup_aof || overall_status="FAILED"
            ;;
        both)
            backup_rdb || overall_status="FAILED"
            backup_aof || log_warn "AOF backup failed or not available"
            ;;
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            exit 1
            ;;
    esac

    if [ "$overall_status" = "SUCCESS" ]; then
        upload_to_cloud || log_warn "Cloud upload failed"
        rotate_backups
    fi

    # Generate report
    local report=$(generate_report "$overall_status")
    echo "$report"
    echo "$report" >> "$LOG_FILE"

    if [ "$overall_status" = "SUCCESS" ]; then
        log_info "=========================================="
        log_info "JobNaut Redis Backup Completed Successfully"
        log_info "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "JobNaut Redis Backup Failed"
        log_error "=========================================="
        exit 1
    fi
}

# Run main function
main "$@"
