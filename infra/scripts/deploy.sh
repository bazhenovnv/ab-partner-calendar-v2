#!/usr/bin/env bash
# deploy.sh — Production deploy script for Timeweb Cloud VPS
set -euo pipefail

VERSION="${1:-latest}"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Deploying AB Afisha v${VERSION}"

$COMPOSE pull

$COMPOSE run --rm backend sh -c "
  cd /app/apps/backend &&
  npx prisma migrate deploy
"

$COMPOSE up -d --remove-orphans

echo "==> Waiting for backend health..."
for i in $(seq 1 20); do
  if $COMPOSE exec -T backend wget -qO- http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "==> Backend is healthy"
    break
  fi
  echo "  attempt $i/20..."
  sleep 5
done

echo "==> Deploy complete: v${VERSION}"
$COMPOSE ps
