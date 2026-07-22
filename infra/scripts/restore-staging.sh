#!/usr/bin/env bash
# restore-staging.sh — Restore production backup into isolated staging
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ab-afisha}"
STAMP="${1:-}"
CONFIRM="${RESTORE_CONFIRM:-}"
LOCK_FILE="${BACKUP_DIR}/.restore-staging.lock"

COMPOSE=(docker compose -p ab-afisha-staging -f docker-compose.staging.yml)

usage() {
  cat <<'EOF'
Usage:
  RESTORE_CONFIRM=RESTORE:staging:<YYYYMMDD_HHMMSS> \
    ./infra/scripts/restore-staging.sh <YYYYMMDD_HHMMSS>
EOF
}

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$STAMP" =~ ^[0-9]{8}_[0-9]{6}$ ]] || { usage; exit 2; }
[[ "$CONFIRM" == "RESTORE:staging:${STAMP}" ]] \
  || fail "confirmation mismatch; expected RESTORE:staging:${STAMP}"

DB_FILE="${BACKUP_DIR}/db_${STAMP}.sql.gz"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${STAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_DIR}/checksums_${STAMP}.sha256"

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v gzip >/dev/null 2>&1 || fail "gzip is not installed"
command -v tar >/dev/null 2>&1 || fail "tar is not installed"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is not installed"
command -v flock >/dev/null 2>&1 || fail "flock is not installed"

[[ -f "$DB_FILE" ]] || fail "database backup not found: $DB_FILE"
[[ -f "$UPLOADS_FILE" ]] || fail "uploads backup not found: $UPLOADS_FILE"
[[ -f "$CHECKSUM_FILE" ]] || fail "checksum file not found: $CHECKSUM_FILE"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "another staging restore is already running"

printf '==> Verifying backup checksums\n'
(
  cd "$BACKUP_DIR"
  sha256sum -c "$(basename "$CHECKSUM_FILE")"
)

gzip -t "$DB_FILE"
tar -tzf "$UPLOADS_FILE" >/dev/null
if tar -tzf "$UPLOADS_FILE" | awk '/(^\/|(^|\/)\.\.($|\/))/ { bad=1 } END { exit(bad ? 0 : 1) }'; then
  fail "uploads archive contains unsafe paths"
fi

"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d postgres redis

printf '==> Stopping staging application writers\n'
"${COMPOSE[@]}" stop backend frontend || true

printf '==> Recreating staging public schema\n'
"${COMPOSE[@]}" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U ab_afisha_staging -d ab_afisha_staging \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

printf '==> Restoring database into isolated staging\n'
gzip -dc "$DB_FILE" \
  | sed \
      -e 's/OWNER TO ab_afisha;/OWNER TO ab_afisha_staging;/g' \
      -e 's/GRANT ALL ON SCHEMA public TO ab_afisha;/GRANT ALL ON SCHEMA public TO ab_afisha_staging;/g' \
  | "${COMPOSE[@]}" exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U ab_afisha_staging -d ab_afisha_staging

printf '==> Restoring uploads into isolated staging volume\n'
STAGING_VOLUME="ab-afisha-staging_uploads"
MOUNTPOINT="$(docker volume inspect -f '{{.Mountpoint}}' "$STAGING_VOLUME")"
[[ -n "$MOUNTPOINT" && -d "$MOUNTPOINT" ]] || fail "cannot resolve staging uploads mountpoint"
find "$MOUNTPOINT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
tar -xzf "$UPLOADS_FILE" -C "$MOUNTPOINT"

printf '==> Starting isolated staging application\n'
"${COMPOSE[@]}" up -d backend frontend

printf '==> Waiting for staging backend health\n'
healthy=false
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T backend \
    wget -qO- http://localhost:3001/api/health >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 5
done

[[ "$healthy" == "true" ]] || {
  "${COMPOSE[@]}" logs --tail=100 backend
  fail "staging backend did not become healthy after restore"
}

printf '==> Staging restore complete: %s\n' "$STAMP"
"${COMPOSE[@]}" ps
