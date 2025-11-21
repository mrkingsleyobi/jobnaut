#!/bin/bash
# Cron Job Setup Script for JobNaut Automated Backups
# Sets up cron jobs for database and Redis backups
# Version: 1.0.0

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_USER="${CRON_USER:-root}"
BACKUP_SCRIPTS_DIR="$SCRIPT_DIR"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../.env}"

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $@"
}

# Display usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Setup automated backup cron jobs for JobNaut

OPTIONS:
    -i, --install       Install cron jobs (default)
    -r, --remove        Remove cron jobs
    -l, --list          List current cron jobs
    -u, --user USER     Cron user (default: root)
    -d, --dry-run       Show what would be done
    -h, --help          Show this help message

EXAMPLES:
    # Install cron jobs
    $0 --install

    # Install for specific user
    $0 --install --user postgres

    # Remove cron jobs
    $0 --remove

    # List current jobs
    $0 --list

    # Dry run to see what would be installed
    $0 --dry-run

EOF
    exit 0
}

# Check if cron is installed
check_cron() {
    if ! command -v crontab >/dev/null 2>&1; then
        log_error "crontab command not found. Please install cron."
        exit 1
    fi

    # Check if cron service is running
    if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
        log_info "Cron service is running"
    else
        log_warn "Cron service may not be running"
    fi
}

# Generate cron job entries
generate_cron_entries() {
    cat <<EOF
# JobNaut Automated Backup Jobs
# Generated on $(date)
# DO NOT EDIT MANUALLY - Use setup-cron.sh to manage

# Environment variables
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=${NOTIFICATION_EMAIL:-}

# Database Backups
# Daily full backup at 2:00 AM
0 2 * * * $BACKUP_SCRIPTS_DIR/backup-database.sh >> /var/log/jobnaut-backup-cron.log 2>&1

# Database schema backup every 6 hours
0 */6 * * * BACKUP_TYPE=schema $BACKUP_SCRIPTS_DIR/backup-database.sh >> /var/log/jobnaut-backup-cron.log 2>&1

# Weekly full backup on Sunday at 3:00 AM
0 3 * * 0 $BACKUP_SCRIPTS_DIR/backup-database.sh >> /var/log/jobnaut-backup-cron.log 2>&1

# Monthly archive on the 1st at 4:00 AM
0 4 1 * * $BACKUP_SCRIPTS_DIR/backup-database.sh >> /var/log/jobnaut-backup-monthly.log 2>&1

# Redis Backups
# Hourly RDB snapshot
0 * * * * $BACKUP_SCRIPTS_DIR/backup-redis.sh >> /var/log/jobnaut-redis-backup-cron.log 2>&1

# Daily RDB backup at 1:00 AM
0 1 * * * BACKUP_TYPE=rdb $BACKUP_SCRIPTS_DIR/backup-redis.sh >> /var/log/jobnaut-redis-backup-cron.log 2>&1

# AOF backup every 4 hours
0 */4 * * * BACKUP_TYPE=aof $BACKUP_SCRIPTS_DIR/backup-redis.sh >> /var/log/jobnaut-redis-backup-cron.log 2>&1

# Backup Verification and Cleanup
# Daily backup verification at 5:00 AM
0 5 * * * $BACKUP_SCRIPTS_DIR/verify-backups.sh >> /var/log/jobnaut-verify-cron.log 2>&1

# Weekly backup integrity check on Saturday at 6:00 AM
0 6 * * 6 $BACKUP_SCRIPTS_DIR/test-restore.sh >> /var/log/jobnaut-test-restore.log 2>&1

# Health Checks
# Every 5 minutes, check backup status
*/5 * * * * curl -sf http://localhost:3000/health/backup >/dev/null || echo "Backup health check failed" | mail -s "JobNaut Backup Alert" ${NOTIFICATION_EMAIL:-root}

# Monitoring and Alerts
# Daily backup report at 7:00 AM
0 7 * * * $BACKUP_SCRIPTS_DIR/backup-report.sh >> /var/log/jobnaut-backup-report.log 2>&1

EOF
}

# Generate systemd timer alternative (optional)
generate_systemd_timers() {
    log_info "Generating systemd timer files..."

    # Database backup timer
    cat > /tmp/jobnaut-db-backup.timer <<EOF
[Unit]
Description=JobNaut Database Backup Timer
Requires=jobnaut-db-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Database backup service
    cat > /tmp/jobnaut-db-backup.service <<EOF
[Unit]
Description=JobNaut Database Backup Service
After=postgresql.service

[Service]
Type=oneshot
User=postgres
EnvironmentFile=$ENV_FILE
ExecStart=$BACKUP_SCRIPTS_DIR/backup-database.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Redis backup timer
    cat > /tmp/jobnaut-redis-backup.timer <<EOF
[Unit]
Description=JobNaut Redis Backup Timer
Requires=jobnaut-redis-backup.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Redis backup service
    cat > /tmp/jobnaut-redis-backup.service <<EOF
[Unit]
Description=JobNaut Redis Backup Service
After=redis.service

[Service]
Type=oneshot
User=redis
EnvironmentFile=$ENV_FILE
ExecStart=$BACKUP_SCRIPTS_DIR/backup-redis.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    log_info "Systemd timer files generated in /tmp/"
    log_info "To install, run:"
    log_info "  sudo cp /tmp/jobnaut-*-backup.* /etc/systemd/system/"
    log_info "  sudo systemctl daemon-reload"
    log_info "  sudo systemctl enable jobnaut-db-backup.timer"
    log_info "  sudo systemctl enable jobnaut-redis-backup.timer"
    log_info "  sudo systemctl start jobnaut-db-backup.timer"
    log_info "  sudo systemctl start jobnaut-redis-backup.timer"
}

# Install cron jobs
install_cron() {
    local dry_run=${1:-false}

    log_info "Installing cron jobs for user: $CRON_USER"

    # Make scripts executable
    chmod +x "$BACKUP_SCRIPTS_DIR"/backup-database.sh
    chmod +x "$BACKUP_SCRIPTS_DIR"/restore-database.sh
    chmod +x "$BACKUP_SCRIPTS_DIR"/backup-redis.sh

    # Generate cron entries
    local cron_entries=$(generate_cron_entries)

    if [ "$dry_run" = "true" ]; then
        log_info "DRY RUN - Would install the following cron jobs:"
        echo "$cron_entries"
        return 0
    fi

    # Backup existing crontab
    if crontab -u "$CRON_USER" -l >/dev/null 2>&1; then
        log_info "Backing up existing crontab..."
        crontab -u "$CRON_USER" -l > "/tmp/crontab-backup-$(date +%Y%m%d_%H%M%S).txt"
    fi

    # Get existing crontab
    local existing_cron=""
    if crontab -u "$CRON_USER" -l >/dev/null 2>&1; then
        existing_cron=$(crontab -u "$CRON_USER" -l | grep -v "JobNaut Automated Backup" || true)
    fi

    # Combine existing and new cron jobs
    local new_cron="${existing_cron}
${cron_entries}"

    # Install new crontab
    echo "$new_cron" | crontab -u "$CRON_USER" -

    log_info "Cron jobs installed successfully"
    log_info "View installed jobs with: crontab -u $CRON_USER -l"
}

# Remove cron jobs
remove_cron() {
    log_info "Removing JobNaut backup cron jobs for user: $CRON_USER"

    if ! crontab -u "$CRON_USER" -l >/dev/null 2>&1; then
        log_warn "No crontab found for user: $CRON_USER"
        return 0
    fi

    # Backup current crontab
    crontab -u "$CRON_USER" -l > "/tmp/crontab-backup-$(date +%Y%m%d_%H%M%S).txt"

    # Remove JobNaut backup lines
    crontab -u "$CRON_USER" -l | grep -v "JobNaut" | grep -v "backup-database.sh" | grep -v "backup-redis.sh" | crontab -u "$CRON_USER" -

    log_info "Cron jobs removed successfully"
}

# List current cron jobs
list_cron() {
    log_info "Current cron jobs for user: $CRON_USER"

    if crontab -u "$CRON_USER" -l >/dev/null 2>&1; then
        crontab -u "$CRON_USER" -l | grep -i "jobnaut\|backup" || log_info "No JobNaut backup jobs found"
    else
        log_warn "No crontab found for user: $CRON_USER"
    fi
}

# Verify cron setup
verify_cron_setup() {
    log_info "Verifying cron setup..."

    # Check if backup scripts exist and are executable
    local scripts=("backup-database.sh" "restore-database.sh" "backup-redis.sh")
    for script in "${scripts[@]}"; do
        local script_path="$BACKUP_SCRIPTS_DIR/$script"
        if [ ! -f "$script_path" ]; then
            log_error "Script not found: $script_path"
            return 1
        fi
        if [ ! -x "$script_path" ]; then
            log_warn "Script not executable: $script_path"
            chmod +x "$script_path"
        fi
    done

    # Check log directory
    local log_dir="/var/log"
    if [ ! -w "$log_dir" ]; then
        log_error "Log directory not writable: $log_dir"
        return 1
    fi

    # Check backup directories
    local backup_dirs=("/var/backups/jobnaut/postgresql" "/var/backups/jobnaut/redis")
    for dir in "${backup_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log_info "Creating backup directory: $dir"
            mkdir -p "$dir"
        fi
    done

    log_info "Verification complete"
}

# Main execution
main() {
    local action="install"
    local dry_run=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--install)
                action="install"
                shift
                ;;
            -r|--remove)
                action="remove"
                shift
                ;;
            -l|--list)
                action="list"
                shift
                ;;
            -u|--user)
                CRON_USER="$2"
                shift 2
                ;;
            -d|--dry-run)
                dry_run=true
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

    log_info "=========================================="
    log_info "JobNaut Cron Setup"
    log_info "=========================================="

    check_cron

    case "$action" in
        install)
            verify_cron_setup
            install_cron "$dry_run"
            [ "$dry_run" = "false" ] && list_cron
            ;;
        remove)
            remove_cron
            ;;
        list)
            list_cron
            ;;
    esac

    log_info "=========================================="
    log_info "Cron setup completed"
    log_info "=========================================="

    # Show systemd alternative
    if [ "$action" = "install" ] && [ "$dry_run" = "false" ]; then
        echo
        log_info "Alternative: Use systemd timers instead of cron"
        read -p "Generate systemd timer files? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            generate_systemd_timers
        fi
    fi
}

# Run main function
main "$@"
