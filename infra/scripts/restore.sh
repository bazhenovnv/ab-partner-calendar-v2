#!/usr/bin/env bash
# restore.sh — Restore PostgreSQL and/or uploads from verified backups
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ab-afisha}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-ab-afisha_uploads}"
MODE="${1:-}"
STAMP="${2:-}"

COMPOSE=(
  docker compose
  -f docker-compose.prod.yml
  -f docker-compose.staging.yml
)

usage() {
  cat <<'EOF'
Usage:
  restore.sh db <YYYYMMDD_HHMMSS>
  restore.sh uploads <YYYYMMDD_HHMMSS>
  restore.sh all <YYYYMMDD_HHMMSS>

Set RESTORE_CONFIRM=YES to authorize the destructive operation.
Example:
  RESTORE_CONFIRM=YES ./infra/scripts/restore.sh all 20260722_104513
EOF
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$MODE" =~ ^(db|uploads|all)$ ]] || { usage; exit 2; }
[[ "$STAMP" =~ ^[0-9]{8}_[0-9]{6}$ ]] || { usage; exit 2; }
[[ "${RESTORE_CONFIRM:-}" == "YES" ]] \
  || fail "restore is destructive; rerun with RESTORE_CONFIRM=YES"

DB_FILE="${BACKUP_DIR}/db_${STAMP}.sql.gz"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${STAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_DIR}/checksums_${STAMP}.sha256"

"${COMPOSE[@]}" config --quiet

if [[ -f "$CHECKSUM_FILE" ]]; then
  printf '==> Verifying checksums\n'
  (cd "$BACKUP_DIR" && sha256sum -c "$(basename "$CHECKSUM_FILE")")
fi

restore_db() {
  [[ -f "$DB_FILE" ]] || fail "database backup not found: $DB_FILE"
  gzip -t "$DB_FILE"

  printf '==> Stopping application writers\n'
  "${COMPOSE[@]}" stop backend bots

  printf '==> Recreating public schema\n'
  "${COMPOSE[@]}" exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U ab_afisha -d ab_afisha \
    -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

  printf '==> Restoring PostgreSQL\n'
  gzip -dc "$DB_FILE" \
    | "${COMPOSE[@]}" exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U ab_afisha -d ab_afisha

  printf '==> Starting application services\n'
  "${COMPOSE[@]}" up -d backend bots
}

restore_uploads() {
  [[ -f "$UPLOADS_FILE" ]] || fail "uploads backup not found: $UPLOADS_FILE"
  tar -tzf "$UPLOADS_FILE" >/dev/null
  docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1 \
    || fail "Docker volume not found: $UPLOADS_VOLUME"

  printf '==> Restoring uploads volume\n'
  docker run --rm \
    -v "${UPLOADS_VOLUME}:/target" \
    -v "${BACKUP_DIR}:/backup:ro" \
    alpine:3.20 sh -eu -c \
    'find /target -mindepth 1 -maxdepth 1 -exec rm -rf {} +; tar -xzf "/backup/'"$(basename "$UPLOADS_FILE")"'" -C /target'
}

case "$MODE" in
  db)
    restore_db
    ;;
  uploads)
    restore_uploads
    ;;
  all)
    restore_db
    restore_uploads
    ;;
esac

printf '==> Restore complete: %s (%s)\n' "$STAMP" "$MODE"
"${COMPOSE[@]}" ps
