#!/usr/bin/env bash
# backup.sh — PostgreSQL + uploads backup
set -euo pipefail

BACKUP_DIR="/var/backups/ab-afisha"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

echo "==> Backing up PostgreSQL..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U ab_afisha ab_afisha | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

echo "==> Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C /var/lib/docker/volumes/ ab-partner-calendar-v2_uploads

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +14 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +14 -delete

echo "==> Backup complete: $DATE"
ls -lh "$BACKUP_DIR" | tail -5
