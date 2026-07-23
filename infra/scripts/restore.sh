#!/usr/bin/env bash
# restore.sh — Restore PostgreSQL and/or uploads from verified backups
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
cd "$PROJECT_DIR"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ab-afisha}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-ab-afisha_uploads}"
MODE="${1:-}"
STAMP="${2:-}"
LOCK_FILE="${BACKUP_DIR}/.restore.lock"
WRITERS_STOPPED=0

COMPOSE=(docker compose -f docker-compose.prod.yml)
if [[ -f docker-compose.staging.yml ]]; then
  COMPOSE+=(-f docker-compose.staging.yml)
fi

usage() {
  cat <<'EOF'
Usage:
  sudo RESTORE_CONFIRM='RESTORE:<mode>:<YYYYMMDD_HHMMSS>' \
    ./infra/scripts/restore.sh <db|uploads|all> <YYYYMMDD_HHMMSS>

Examples:
  sudo RESTORE_CONFIRM='RESTORE:db:20260722_113559' \
    ./infra/scripts/restore.sh db 20260722_113559

  sudo RESTORE_CONFIRM='RESTORE:all:20260722_113559' \
    ./infra/scripts/restore.sh all 20260722_113559

The operation is destructive. On any restore failure, backend and bots remain
stopped for manual inspection; they are restarted only after full success.
EOF
}

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

on_exit() {
  status=$?
  if [[ "$status" -ne 0 && "$WRITERS_STOPPED" -eq 1 ]]; then
    printf 'ERROR: restore failed; backend and bots remain stopped\n' >&2
  fi
  exit "$status"
}
trap on_exit EXIT

[[ "$MODE" =~ ^(db|uploads|all)$ ]] || { usage; exit 2; }
[[ "$STAMP" =~ ^[0-9]{8}_[0-9]{6}$ ]] || { usage; exit 2; }
EXPECTED_CONFIRM="RESTORE:${MODE}:${STAMP}"
[[ "${RESTORE_CONFIRM:-}" == "$EXPECTED_CONFIRM" ]] \
  || fail "confirmation mismatch; set RESTORE_CONFIRM='${EXPECTED_CONFIRM}'"
[[ "$EUID" -eq 0 ]] || fail "restore must run as root (use sudo)"

for command_name in docker gzip sha256sum awk flock find tar; do
  command -v "$command_name" >/dev/null 2>&1 \
    || fail "required command is not installed: $command_name"
done

install -d -m 0700 "$BACKUP_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || fail "another restore is already running"

DB_FILE="${BACKUP_DIR}/db_${STAMP}.sql.gz"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${STAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_DIR}/checksums_${STAMP}.sha256"

"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" ps --status running postgres >/dev/null
[[ -f "$CHECKSUM_FILE" ]] \
  || fail "checksum manifest not found: $CHECKSUM_FILE"

verify_file() {
  local file_path="$1"
  local file_name checksum_line

  [[ -f "$file_path" ]] || fail "backup file not found: $file_path"
  file_name="$(basename "$file_path")"
  checksum_line="$(awk -v name="$file_name" '$2 == name { print; found=1 } END { if (!found) exit 1 }' "$CHECKSUM_FILE")" \
    || fail "checksum entry not found for: $file_name"

  printf '%s\n' "$checksum_line" \
    | (cd "$BACKUP_DIR" && sha256sum -c -)
}

preflight_db() {
  verify_file "$DB_FILE"
  gzip -t "$DB_FILE"
  gzip -dc "$DB_FILE" \
    | awk '/^(CREATE TABLE|COPY )/ { found=1 } END { exit(found ? 0 : 1) }' \
    || fail "database dump does not contain expected SQL statements"
}

preflight_uploads() {
  verify_file "$UPLOADS_FILE"
  tar -tzf "$UPLOADS_FILE" \
    | awk '
        /^\// { bad=1 }
        /(^|\/)\.\.($|\/)/ { bad=1 }
        END { exit(bad ? 1 : 0) }
      ' \
    || fail "uploads archive contains unsafe paths"
}

case "$MODE" in
  db)
    preflight_db
    ;;
  uploads)
    preflight_uploads
    ;;
  all)
    preflight_db
    preflight_uploads
    ;;
esac

restore_db() {
  log "Recreating PostgreSQL public schema"
  "${COMPOSE[@]}" exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U ab_afisha -d ab_afisha \
    -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

  log "Restoring PostgreSQL"
  gzip -dc "$DB_FILE" \
    | "${COMPOSE[@]}" exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U ab_afisha -d ab_afisha
}

restore_uploads() {
  local mountpoint

  docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1 \
    || fail "Docker volume not found: $UPLOADS_VOLUME"
  mountpoint="$(docker volume inspect -f '{{ .Mountpoint }}' "$UPLOADS_VOLUME")"
  [[ -n "$mountpoint" && -d "$mountpoint" ]] \
    || fail "invalid Docker volume mountpoint: $mountpoint"

  log "Clearing uploads volume ${UPLOADS_VOLUME}"
  find "$mountpoint" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +

  log "Restoring uploads volume ${UPLOADS_VOLUME}"
  tar --numeric-owner -xzf "$UPLOADS_FILE" -C "$mountpoint"
}

log "Stopping application writers"
"${COMPOSE[@]}" stop backend bots
WRITERS_STOPPED=1

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

log "Starting application services"
"${COMPOSE[@]}" up -d backend bots
WRITERS_STOPPED=0

log "Restore complete: ${STAMP} (${MODE})"
"${COMPOSE[@]}" ps
