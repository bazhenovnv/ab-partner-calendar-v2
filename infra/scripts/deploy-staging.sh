#!/usr/bin/env bash
# deploy-staging.sh — Deploy isolated staging stack
set -Eeuo pipefail

VERSION="${1:-latest}"
export APP_VERSION="$VERSION"

COMPOSE=(docker compose -p ab-afisha-staging -f docker-compose.staging.yml)

log() { printf '==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "docker is not installed"

docker network inspect ab-afisha-proxy >/dev/null 2>&1 \
  || fail "external network ab-afisha-proxy is missing"

log "Validating isolated staging Compose configuration"
"${COMPOSE[@]}" config --quiet

log "Refreshing infrastructure images (best effort)"
if ! "${COMPOSE[@]}" pull postgres redis; then
  log "Docker Hub unavailable or rate limited; using local infrastructure images"
fi

log "Checking local application images v${VERSION}"
docker image inspect \
  "ab-afisha/backend:${VERSION}" \
  "ab-afisha/frontend:${VERSION}" \
  >/dev/null 2>&1 \
  || fail "local backend/frontend images v${VERSION} are missing"

log "Starting staging data services"
"${COMPOSE[@]}" up -d postgres redis

log "Applying staging database migrations"
"${COMPOSE[@]}" run --rm --pull never backend sh -c '
  cd /app/apps/backend &&
  npx prisma migrate deploy
'

log "Starting isolated staging application"
"${COMPOSE[@]}" up -d --pull never --remove-orphans backend frontend

log "Waiting for staging backend health"
healthy=false
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T backend \
    wget -qO- http://localhost:3001/api/health >/dev/null 2>&1; then
    healthy=true
    log "Staging backend is healthy"
    break
  fi
  printf '  attempt %s/30...\n' "$i"
  sleep 5
done

if [[ "$healthy" != "true" ]]; then
  "${COMPOSE[@]}" ps
  "${COMPOSE[@]}" logs --tail=100 backend
  fail "staging backend did not become healthy"
fi

log "Staging deploy complete: v${VERSION}"
"${COMPOSE[@]}" ps
