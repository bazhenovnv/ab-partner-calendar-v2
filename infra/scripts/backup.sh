#!/usr/bin/env bash
# backup.sh — Verified PostgreSQL + uploads backup
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ab-afisha}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-ab-afisha_uploads}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
LOCK_FILE="${BACKUP_DIR}/.backup.lock"

COMPOSE=(
  docker compose
  -f docker-compose.prod.yml
  -f docker-compose.staging.yml
)

DB_FILE="${BACKUP_DIR}/db_${STAMP}.sql.gz"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${STAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_DIR}/checksums_${STAMP}.sha256"

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup_partial() {
  rm -f "${DB_FILE}.tmp" "${UPLOADS_FILE}.tmp" "${CHECKSUM_FILE}.tmp"
}
trap cleanup_partial EXIT

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v gzip >/dev/null 2>&1 || fail "gzip is not installed"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is not installed"

install -d -m 0700 "$BACKUP_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || fail "another backup is already running"

"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" ps --status running postgres >/dev/null

docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1 \
  || fail "Docker volume not found: ${UPLOADS_VOLUME}"

log "Backing up PostgreSQL"
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U ab_afisha -d ab_afisha \
  | gzip -9 >"${DB_FILE}.tmp"

gzip -t "${DB_FILE}.tmp"
zgrep -q -E '^CREATE TABLE|^COPY ' "${DB_FILE}.tmp" \
  || fail "database dump does not contain expected SQL statements"
mv "${DB_FILE}.tmp" "$DB_FILE"

log "Backing up uploads volume ${UPLOADS_VOLUME}"
docker run --rm \
  -v "${UPLOADS_VOLUME}:/source:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$(basename "${UPLOADS_FILE}.tmp")" -C /source .

tar -tzf "${UPLOADS_FILE}.tmp" >/dev/null
mv "${UPLOADS_FILE}.tmp" "$UPLOADS_FILE"

log "Writing checksums"
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$DB_FILE")" "$(basename "$UPLOADS_FILE")"
) >"${CHECKSUM_FILE}.tmp"
mv "${CHECKSUM_FILE}.tmp" "$CHECKSUM_FILE"

log "Removing backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -type f \
  \( -name 'db_*.sql.gz' -o -name 'uploads_*.tar.gz' -o -name 'checksums_*.sha256' \) \
  -mtime "+${RETENTION_DAYS}" -delete

trap - EXIT
log "Backup complete: ${STAMP}"
ls -lh "$DB_FILE" "$UPLOADS_FILE" "$CHECKSUM_FILE"
