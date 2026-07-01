#!/bin/sh
set -e

echo "[entrypoint] Running prisma migrate deploy..."
pnpm exec prisma migrate deploy

echo "[entrypoint] Starting application..."
exec "$@"
