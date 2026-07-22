#!/usr/bin/env bash
# deploy.sh — Production deploy script for Timeweb Cloud VPS
set -Eeuo pipefail

VERSION="${1:-latest}"
export APP_VERSION="$VERSION"

COMPOSE=(docker compose -f docker-compose.prod.yml)

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is not installed"

docker network inspect ab-afisha-proxy >/dev/null 2>&1 \
  || fail "external network ab-afisha-proxy is missing"
docker volume inspect ab-afisha-staging_uploads >/dev/null 2>&1 \
  || fail "external volume ab-afisha-staging_uploads is missing"

log "Validating production Compose configuration"
"${COMPOSE[@]}" config --quiet

log "Deploying production AB Afisha v${VERSION}"
"${COMPOSE[@]}" pull

log "Applying production database migrations"
"${COMPOSE[@]}" run --rm backend sh -c '
  cd /app/apps/backend &&
  npx prisma migrate deploy
'

log "Starting production services"
"${COMPOSE[@]}" up -d --remove-orphans

log "Waiting for production backend health"
healthy=false
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T backend \
    wget -qO- http://localhost:3001/api/health >/dev/null 2>&1; then
    healthy=true
    log "Production backend is healthy"
    break
  fi

  printf '  attempt %s/30...\n' "$i"
  sleep 5
done

if [[ "$healthy" != "true" ]]; then
  "${COMPOSE[@]}" ps
  "${COMPOSE[@]}" logs --tail=100 backend
  fail "production backend did not become healthy"
fi

log "Production deploy complete: v${VERSION}"
"${COMPOSE[@]}" ps
