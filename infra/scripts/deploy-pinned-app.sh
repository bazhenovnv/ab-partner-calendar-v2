#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
LOCK_FILE="${LOCK_FILE:-$ROOT/infra/deploy/production-frontend.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://ab-event.pro}"
MIN_FREE_KB="${MIN_FREE_KB:-5242880}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

section() {
  printf '\n=== %s ===\n' "$1"
}

[ -f "$LOCK_FILE" ] || fail "production lock is missing: $LOCK_FILE"
# shellcheck disable=SC1090
source "$LOCK_FILE"

: "${PRODUCTION_RELEASE_COMMIT:?missing PRODUCTION_RELEASE_COMMIT}"
: "${PRODUCTION_BACKEND_COMMIT:?missing PRODUCTION_BACKEND_COMMIT}"
: "${PRODUCTION_BACKEND_TAG:?missing PRODUCTION_BACKEND_TAG}"
: "${PRODUCTION_BACKEND_IMAGE:?missing PRODUCTION_BACKEND_IMAGE}"
: "${PRODUCTION_FRONTEND_COMMIT:?missing PRODUCTION_FRONTEND_COMMIT}"
: "${PRODUCTION_FRONTEND_TAG:?missing PRODUCTION_FRONTEND_TAG}"
: "${PRODUCTION_FRONTEND_IMAGE:?missing PRODUCTION_FRONTEND_IMAGE}"

[ "$PRODUCTION_BACKEND_COMMIT" = "$PRODUCTION_RELEASE_COMMIT" ] \
  || fail "backend commit differs from release commit"
[ "$PRODUCTION_FRONTEND_COMMIT" = "$PRODUCTION_RELEASE_COMMIT" ] \
  || fail "frontend commit differs from release commit"
[ "$PRODUCTION_BACKEND_IMAGE" = "ab-afisha/backend:${PRODUCTION_BACKEND_TAG}" ] \
  || fail "backend image and tag disagree"
[ "$PRODUCTION_FRONTEND_IMAGE" = "ab-afisha/frontend:${PRODUCTION_FRONTEND_TAG}" ] \
  || fail "frontend image and tag disagree"

SHORT="${PRODUCTION_RELEASE_COMMIT:0:7}"
WORKTREE="/srv/ab-afisha-pinned-app-${SHORT}"
FRONTEND_PREFLIGHT="ab-afisha-frontend-preflight-${SHORT}"
FRONTEND_ENV_FILE=""
SWITCHED=0
OLD_BACKEND_IMAGE=""
OLD_FRONTEND_IMAGE=""

cd "$ROOT"

compose_with_images() {
  local backend_image="$1"
  local frontend_image="$2"
  shift 2
  BACKEND_IMAGE="$backend_image" \
  FRONTEND_IMAGE="$frontend_image" \
    docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

dc() {
  compose_with_images "$PRODUCTION_BACKEND_IMAGE" "$PRODUCTION_FRONTEND_IMAGE" "$@"
}

wait_backend() {
  local container="$1"
  local expected_image="$2"

  for attempt in $(seq 1 90); do
    local state image health
    state="$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || true)"
    image="$(docker inspect "$container" --format '{{.Config.Image}}' 2>/dev/null || true)"
    health="$(docker inspect "$container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' 2>/dev/null || true)"
    echo "Backend $attempt: state=${state:-unknown} health=${health:-unknown} image=${image:-unknown}"

    if [ "$state" = "running" ] && [ "$image" = "$expected_image" ] && \
      docker exec "$container" node -e '
fetch("http://localhost:3001/api/health")
  .then((response) => process.exit(response.status === 200 ? 0 : 1))
  .catch(() => process.exit(1));
' >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  docker logs --tail 250 "$container" || true
  return 1
}

wait_frontend() {
  local container="$1"
  local expected_image="$2"

  for attempt in $(seq 1 90); do
    local state image
    state="$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || true)"
    image="$(docker inspect "$container" --format '{{.Config.Image}}' 2>/dev/null || true)"
    echo "Frontend $attempt: state=${state:-unknown} image=${image:-unknown}"

    if [ "$state" = "running" ] && [ "$image" = "$expected_image" ] && \
      docker exec "$container" node -e '
const url = `http://${process.env.HOSTNAME}:3000/`;
fetch(url)
  .then((response) => process.exit(response.status === 200 ? 0 : 1))
  .catch(() => process.exit(1));
' >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  docker logs --tail 250 "$container" || true
  return 1
}

wait_reconciliation() {
  local container="$1"

  for attempt in $(seq 1 120); do
    local logs success
    logs="$(docker logs --since 10m "$container" 2>&1 || true)"
    success="$(grep -F 'MAX startup reconciliation finished:' <<<"$logs" | tail -n 1 || true)"

    if [ -n "$success" ]; then
      echo "$success"
      return 0
    fi
    if grep -Fq 'MAX startup reconciliation failed:' <<<"$logs"; then
      grep -F 'MAX startup reconciliation failed:' <<<"$logs" | tail -n 1
      return 1
    fi

    echo "MAX startup reconciliation $attempt: waiting"
    sleep 2
  done

  docker logs --tail 300 "$container" || true
  return 1
}

read_env() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ROOT/.env" | tail -n 1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  case "$value" in
    \"*\") value="${value:1:${#value}-2}" ;;
    \'*\') value="${value:1:${#value}-2}" ;;
  esac
  printf '%s' "$value"
}

build_images() {
  local -a frontend_args=()

  section "СБОРКА ЗАКРЕПЛЁННЫХ ОБРАЗОВ"

  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
  git worktree add --detach "$WORKTREE" "$PRODUCTION_RELEASE_COMMIT"
  test "$(git -C "$WORKTREE" rev-parse HEAD)" = "$PRODUCTION_RELEASE_COMMIT"
  test -z "$(git -C "$WORKTREE" status --porcelain)"

  if ! docker image inspect "$PRODUCTION_BACKEND_IMAGE" >/dev/null 2>&1; then
    (
      cd "$WORKTREE"
      DOCKER_BUILDKIT=1 docker build \
        --progress=plain \
        --label "org.opencontainers.image.revision=${PRODUCTION_BACKEND_COMMIT}" \
        --file apps/backend/Dockerfile \
        --tag "$PRODUCTION_BACKEND_IMAGE" \
        .
    )
  fi

  for key in \
    NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_YANDEX_METRIKA_ID \
    NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME \
    NEXT_PUBLIC_TELEGRAM_BOT_URL \
    NEXT_PUBLIC_MAX_BOT_USERNAME \
    NEXT_PUBLIC_MAX_BOT_URL
  do
    value="$(read_env "$key")"
    [ -z "$value" ] || frontend_args+=(--build-arg "${key}=${value}")
  done

  if ! docker image inspect "$PRODUCTION_FRONTEND_IMAGE" >/dev/null 2>&1; then
    (
      cd "$WORKTREE"
      DOCKER_BUILDKIT=1 docker build \
        --progress=plain \
        --label "org.opencontainers.image.revision=${PRODUCTION_FRONTEND_COMMIT}" \
        "${frontend_args[@]}" \
        --file apps/frontend/Dockerfile \
        --tag "$PRODUCTION_FRONTEND_IMAGE" \
        .
    )
  fi

  git worktree remove --force "$WORKTREE"
  git worktree prune
}

reset_recent_backfill() {
  local container="$1"

  docker exec -i "$container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.siteConfig.deleteMany({
  where: { key: 'maxImport.recentBackfillV3' },
})
  .then((result) => console.log(`RECENT_BACKFILL_MARKER_REMOVED=${result.count}`))
  .finally(() => prisma.$disconnect());
NODE
}

print_sync_diagnostics() {
  local container="$1"

  docker exec -i "$container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    where: { source: 'MAX' },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      title: true,
      status: true,
      startDate: true,
      externalId: true,
      lastSyncedAt: true,
      updatedAt: true,
      images: { select: { id: true } },
    },
  });
  const logs = await prisma.maxImportLog.findMany({
    orderBy: { runAt: 'desc' },
    take: 5,
  });

  console.log('LATEST_MAX_EVENTS=' + JSON.stringify(events.map((event) => ({
    title: event.title,
    status: event.status,
    startDate: event.startDate.toISOString(),
    externalId: event.externalId,
    lastSyncedAt: event.lastSyncedAt?.toISOString() ?? null,
    updatedAt: event.updatedAt.toISOString(),
    images: event.images.length,
  }))));
  console.log('LATEST_MAX_IMPORT_LOGS=' + JSON.stringify(logs));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
NODE
}

verify_public() {
  local backend_container="$1"
  local homepage_http health_http

  homepage_http=""
  health_http=""
  for attempt in $(seq 1 30); do
    homepage_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/?release=${SHORT}" || true)"
    health_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/api/health" || true)"
    echo "Public $attempt: homepage=$homepage_http health=$health_http"
    [ "$homepage_http" = "200" ] && [ "$health_http" = "200" ] && break
    sleep 2
  done

  test "$homepage_http" = "200"
  test "$health_http" = "200"

  docker exec -e VERIFY_PUBLIC_URL="$PUBLIC_URL" -i "$backend_container" node <<'NODE'
const base = process.env.VERIFY_PUBLIC_URL;

async function json(path) {
  const response = await fetch(base + path, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const events = await json('/api/events/public?page=1&limit=6');
  if (!events || !Array.isArray(events.events)) {
    throw new Error('Invalid public events payload');
  }

  const now = new Date();
  const calendar = await json(
    `/api/events/public/calendar?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`,
  );
  if (!Array.isArray(calendar)) {
    throw new Error('Invalid public calendar payload');
  }

  console.log(`PUBLIC_EVENTS_COUNT=${events.events.length}`);
  console.log(`PUBLIC_EVENTS_TOTAL=${events.total}`);
  console.log(`PUBLIC_CALENDAR_MARKERS=${calendar.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

  echo "PUBLIC_HTTP=$homepage_http"
  echo "PUBLIC_HEALTH_HTTP=$health_http"
}

cleanup() {
  set +e
  docker rm -f "$FRONTEND_PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "$FRONTEND_ENV_FILE" ] || rm -f "$FRONTEND_ENV_FILE"
  git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
}

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0
  [ -n "$OLD_BACKEND_IMAGE" ] || return 0
  [ -n "$OLD_FRONTEND_IMAGE" ] || return 0

  section "АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND И FRONTEND"
  compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" \
    up -d --no-deps --force-recreate backend frontend || true

  local backend frontend
  backend="$(compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" ps -q backend 2>/dev/null || true)"
  frontend="$(compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" ps -q frontend 2>/dev/null || true)"
  [ -z "$backend" ] || wait_backend "$backend" "$OLD_BACKEND_IMAGE" || true
  [ -z "$frontend" ] || wait_frontend "$frontend" "$OLD_FRONTEND_IMAGE" || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "PINNED_APP_DEPLOY_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap cleanup EXIT
trap on_error ERR

section "1. ПРОВЕРКА ЗАКРЕПЛЁННОГО РЕЛИЗА"

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v git >/dev/null 2>&1 || fail "git is not installed"
command -v curl >/dev/null 2>&1 || fail "curl is not installed"
test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"
test -d "$ROOT/.git"

available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
echo "AVAILABLE_DISK_KB=$available_kb"
test "$available_kb" -ge "$MIN_FREE_KB"

# Fetch the approved commit without touching the possibly damaged origin/main ref.
git fetch --no-tags origin "$PRODUCTION_RELEASE_COMMIT"
git cat-file -e "${PRODUCTION_RELEASE_COMMIT}^{commit}"

echo "PINNED_COMMIT=$PRODUCTION_RELEASE_COMMIT"
echo "PINNED_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PINNED_FRONTEND=$PRODUCTION_FRONTEND_IMAGE"

BACKEND_IMAGE="$PRODUCTION_BACKEND_IMAGE" \
FRONTEND_IMAGE="$PRODUCTION_FRONTEND_IMAGE" \
  docker compose -p ab-afisha -f "$COMPOSE_FILE" config --quiet

build_images

backend_revision="$(docker image inspect "$PRODUCTION_BACKEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
frontend_revision="$(docker image inspect "$PRODUCTION_FRONTEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
echo "BACKEND_IMAGE_REVISION=$backend_revision"
echo "FRONTEND_IMAGE_REVISION=$frontend_revision"
test "$backend_revision" = "$PRODUCTION_BACKEND_COMMIT"
test "$frontend_revision" = "$PRODUCTION_FRONTEND_COMMIT"

section "2. PREFLIGHT ОБРАЗОВ"

old_backend="$(dc ps -q backend)"
old_frontend="$(dc ps -q frontend)"
bots_before="$(dc ps -q bots)"
nginx_before="$(dc ps -q nginx)"

test -n "$old_backend"
test -n "$old_frontend"
test -n "$bots_before"
test -n "$nginx_before"

OLD_BACKEND_IMAGE="$(docker inspect "$old_backend" --format '{{.Config.Image}}')"
OLD_FRONTEND_IMAGE="$(docker inspect "$old_frontend" --format '{{.Config.Image}}')"
bots_image_before="$(docker inspect "$bots_before" --format '{{.Config.Image}}')"
nginx_sha_before="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_before="$(git status --short --untracked-files=all)"

max_import_enabled="$(docker inspect "$old_backend" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MAX_IMPORT_ENABLED=//p' | tail -n 1)"
echo "MAX_IMPORT_ENABLED=$max_import_enabled"
test "$max_import_enabled" = "true"

echo "BACKEND_BEFORE=$OLD_BACKEND_IMAGE"
echo "FRONTEND_BEFORE=$OLD_FRONTEND_IMAGE"
echo "BOTS_BEFORE=$bots_image_before"

docker run --rm --entrypoint sh "$PRODUCTION_BACKEND_IMAGE" -c \
  'test -f dist/main.js && test -f /etc/ssl/certs/ca-certificates.crt && node -e "require(\"@prisma/client\")"'
echo "BACKEND_PREFLIGHT_OK"

FRONTEND_ENV_FILE="$(mktemp)"
chmod 600 "$FRONTEND_ENV_FILE"
docker inspect "$old_frontend" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -v '^HOSTNAME=' >"$FRONTEND_ENV_FILE"

docker rm -f "$FRONTEND_PREFLIGHT" >/dev/null 2>&1 || true
docker run -d \
  --name "$FRONTEND_PREFLIGHT" \
  --network ab-afisha_default \
  --env-file "$FRONTEND_ENV_FILE" \
  "$PRODUCTION_FRONTEND_IMAGE" \
  >/dev/null
wait_frontend "$FRONTEND_PREFLIGHT" "$PRODUCTION_FRONTEND_IMAGE"
docker rm -f "$FRONTEND_PREFLIGHT" >/dev/null
echo "FRONTEND_PREFLIGHT_OK"

section "3. ПОДГОТОВКА ВОССТАНОВЛЕНИЯ ПРОПУЩЕННЫХ MAX-СОБЫТИЙ"
reset_recent_backfill "$old_backend"

section "4. ПЕРЕКЛЮЧАЕМ BACKEND"

SWITCHED=1
compose_with_images "$PRODUCTION_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" \
  up -d --no-deps --force-recreate backend
new_backend="$(compose_with_images "$PRODUCTION_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" ps -q backend)"
test -n "$new_backend"
wait_backend "$new_backend" "$PRODUCTION_BACKEND_IMAGE"
wait_reconciliation "$new_backend"
echo "PRODUCTION_BACKEND_OK"

section "5. ПЕРЕКЛЮЧАЕМ FRONTEND"

dc up -d --no-deps --force-recreate frontend
new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$PRODUCTION_FRONTEND_IMAGE"
echo "PRODUCTION_FRONTEND_OK"

section "6. ПУБЛИЧНАЯ ПРОВЕРКА И ДИАГНОСТИКА MAX"
verify_public "$new_backend"
print_sync_diagnostics "$new_backend"

section "7. BOTS, NGINX И ЛОКАЛЬНЫЕ ФАЙЛЫ НЕ ИЗМЕНЕНЫ"

bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"
backend_after="$(dc ps -q backend)"
frontend_after="$(dc ps -q frontend)"

test "$backend_after" = "$new_backend"
test "$frontend_after" = "$new_frontend"
test "$bots_after" = "$bots_before"
test "$nginx_after" = "$nginx_before"
test "$(docker inspect "$bots_after" --format '{{.Config.Image}}')" = "$bots_image_before"
test "$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')" = "$nginx_sha_before"
test "$(git status --short --untracked-files=all)" = "$git_status_before"

test "$(docker inspect "$new_backend" --format '{{.Config.Image}}')" = "$PRODUCTION_BACKEND_IMAGE"
test "$(docker inspect "$new_frontend" --format '{{.Config.Image}}')" = "$PRODUCTION_FRONTEND_IMAGE"

SWITCHED=0

printf '\n==========================================\n'
echo "PRODUCTION_APP_PIN_OK"
echo "PRODUCTION_COMMIT=$PRODUCTION_RELEASE_COMMIT"
echo "PRODUCTION_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PRODUCTION_FRONTEND=$PRODUCTION_FRONTEND_IMAGE"
echo "BACKEND_REVISION=$backend_revision"
echo "FRONTEND_REVISION=$frontend_revision"
echo "BOTS_UNCHANGED=true"
echo "NGINX_PRESERVED=true"
echo "LOCAL_CHANGES_PRESERVED=true"
printf '==========================================\n'

dc ps backend frontend bots nginx
