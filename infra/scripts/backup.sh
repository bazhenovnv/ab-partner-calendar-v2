#!/usr/bin/env bash
# backup.sh — Verified PostgreSQL + uploads backup
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ab-afisha}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-ab-afisha_uploads}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
LOCK_FILE="${BACKUP_DIR}/.backup.lock"

COMPOSE=(docker compose -f docker-compose.prod.yml)
if [[ -f docker-compose.staging.yml ]]; then
  COMPOSE+=(-f docker-compose.staging.yml)
fi

DB_FILE="${BACKUP_DIR}/db_${STAMP}.sql.gz"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${STAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_DIR}/checksums_${STAMP}.sha256"
DB_TMP="${DB_FILE}.tmp"
UPLOADS_TMP="${UPLOADS_FILE}.tmp"
CHECKSUM_TMP="${CHECKSUM_FILE}.tmp"
COMPLETE=0

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup_partial() {
  rm -f "$DB_TMP" "$UPLOADS_TMP" "$CHECKSUM_TMP"
  if [[ "$COMPLETE" -ne 1 ]]; then
    rm -f "$DB_FILE" "$UPLOADS_FILE" "$CHECKSUM_FILE"
  fi
}
trap cleanup_partial EXIT

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v gzip >/dev/null 2>&1 || fail "gzip is not installed"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is not installed"
command -v awk >/dev/null 2>&1 || fail "awk is not installed"
command -v flock >/dev/null 2>&1 || fail "flock is not installed"

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
  | gzip -9 >"$DB_TMP"

gzip -t "$DB_TMP"

# Read the entire decompressed stream. Unlike grep -q/zgrep -q, awk does not
# terminate the pipeline after the first match, so pipefail cannot turn the
# expected early close into a false "Broken pipe" failure.
gzip -dc "$DB_TMP" \
  | awk '/^(CREATE TABLE|COPY )/ { found=1 } END { exit(found ? 0 : 1) }' \
  || fail "database dump does not contain expected SQL statements"

log "Backing up uploads volume ${UPLOADS_VOLUME}"
docker run --rm \
  -v "${UPLOADS_VOLUME}:/source:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$(basename "$UPLOADS_TMP")" -C /source .

tar -tzf "$UPLOADS_TMP" >/dev/null

log "Writing checksums"
{
  printf '%s  %s\n' "$(sha256sum "$DB_TMP" | awk '{print $1}')" "$(basename "$DB_FILE")"
  printf '%s  %s\n' "$(sha256sum "$UPLOADS_TMP" | awk '{print $1}')" "$(basename "$UPLOADS_FILE")"
} >"$CHECKSUM_TMP"

mv "$DB_TMP" "$DB_FILE"
mv "$UPLOADS_TMP" "$UPLOADS_FILE"
mv "$CHECKSUM_TMP" "$CHECKSUM_FILE"

(
  cd "$BACKUP_DIR"
  sha256sum -c "$(basename "$CHECKSUM_FILE")"
)

log "Removing backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -type f \
  \( -name 'db_*.sql.gz' -o -name 'uploads_*.tar.gz' -o -name 'checksums_*.sha256' \) \
  -mtime "+${RETENTION_DAYS}" -delete

COMPLETE=1
trap - EXIT
log "Backup complete: ${STAMP}"
ls -lh "$DB_FILE" "$UPLOADS_FILE" "$CHECKSUM_FILE"
