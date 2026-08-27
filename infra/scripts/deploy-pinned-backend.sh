#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
LOCK_FILE="${LOCK_FILE:-$ROOT/infra/deploy/production-frontend.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://ab-event.pro}"
MIN_FREE_KB="${MIN_FREE_KB:-4194304}"

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
: "${PRODUCTION_FRONTEND_IMAGE:?missing PRODUCTION_FRONTEND_IMAGE}"
: "${PRODUCTION_BOTS_COMMIT:?missing PRODUCTION_BOTS_COMMIT}"
: "${PRODUCTION_BOTS_IMAGE:?missing PRODUCTION_BOTS_IMAGE}"

[ "$PRODUCTION_BACKEND_COMMIT" = "$PRODUCTION_RELEASE_COMMIT" ] \
  || fail "backend commit differs from release anchor"
[ "$PRODUCTION_BACKEND_IMAGE" = "ab-afisha/backend:${PRODUCTION_BACKEND_TAG}" ] \
  || fail "backend image and tag disagree"

SHORT="${PRODUCTION_BACKEND_COMMIT:0:7}"
WORKTREE="/srv/ab-afisha-pinned-backend-${SHORT}"
SWITCHED=0
OLD_BACKEND_IMAGE=""
FRONTEND_BEFORE=""
BOTS_BEFORE=""
NGINX_BEFORE=""
FRONTEND_IMAGE_BEFORE=""
BOTS_IMAGE_BEFORE=""
NGINX_IMAGE_BEFORE=""
NGINX_CONFIG_SHA_BEFORE=""
GIT_STATUS_BEFORE=""

cd "$ROOT"

compose_with_backend() {
  local backend_image="$1"
  shift
  BACKEND_IMAGE="$backend_image" \
  FRONTEND_IMAGE="$PRODUCTION_FRONTEND_IMAGE" \
  BOTS_IMAGE="$PRODUCTION_BOTS_IMAGE" \
    docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

dc() {
  compose_with_backend "$PRODUCTION_BACKEND_IMAGE" "$@"
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

    if [ "$state" = "running" ] && [ "$image" = "$expected_image" ] && [ "$health" = "healthy" ]; then
      return 0
    fi
    sleep 2
  done

  docker logs --tail 250 "$container" || true
  return 1
}

reload_nginx() {
  local container="$1"
  [ -n "$container" ] || return 1
  docker exec "$container" nginx -t
  docker exec "$container" nginx -s reload
  echo "NGINX_RELOAD_OK=true"
}

telegram_get_me_once() {
  local container="$1"
  docker exec -i "$container" node <<'NODE'
const https = require('node:https');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

const request = https.get({
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${token}/getMe`,
  family: 6,
  timeout: 10000,
}, (response) => {
  let body = '';
  response.setEncoding('utf8');
  response.on('data', (chunk) => { body += chunk; });
  response.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = null; }
    console.log(`TELEGRAM_GET_ME_HTTP=${response.statusCode}`);
    console.log(`TELEGRAM_GET_ME_OK=${parsed?.ok === true}`);
    console.log(`TELEGRAM_BOT_USERNAME=${parsed?.result?.username ?? ''}`);
    process.exit(response.statusCode === 200 && parsed?.ok === true ? 0 : 1);
  });
});
request.on('timeout', () => request.destroy(new Error('Telegram getMe timeout')));
request.on('error', (error) => {
  console.error(`TELEGRAM_GET_ME_ERROR=${error.message}`);
  process.exit(1);
});
NODE
}

telegram_get_me() {
  local container="$1"
  for attempt in 1 2 3 4 5 6; do
    echo "BACKEND_TELEGRAM_ATTEMPT=$attempt"
    if telegram_get_me_once "$container"; then
      echo "BACKEND_TELEGRAM_GET_ME_OK=true"
      return 0
    fi
    if [ "$attempt" -lt 6 ]; then
      sleep $((attempt * 2))
    fi
  done
  echo "BACKEND_TELEGRAM_GET_ME_OK=false"
  return 1
}

build_backend() {
  section "2. СБОРКА ЗАКРЕПЛЁННОГО BACKEND"

  if docker image inspect "$PRODUCTION_BACKEND_IMAGE" >/dev/null 2>&1; then
    echo "BACKEND_IMAGE_ALREADY_PRESENT=true"
    return 0
  fi

  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
  git worktree add --detach "$WORKTREE" "$PRODUCTION_BACKEND_COMMIT"
  test "$(git -C "$WORKTREE" rev-parse HEAD)" = "$PRODUCTION_BACKEND_COMMIT"
  test -z "$(git -C "$WORKTREE" status --porcelain)"

  (
    cd "$WORKTREE"
    DOCKER_BUILDKIT=1 docker build \
      --progress=plain \
      --label "org.opencontainers.image.revision=${PRODUCTION_BACKEND_COMMIT}" \
      --file apps/backend/Dockerfile \
      --tag "$PRODUCTION_BACKEND_IMAGE" \
      .
  )

  git worktree remove --force "$WORKTREE"
  git worktree prune
}

verify_public() {
  local backend_container="$1"
  local homepage_http=""
  local health_http=""

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
const { PrismaClient } = require('@prisma/client');
const { isPlausibleCityName } = require('@ab-afisha/shared');
const prisma = new PrismaClient();
const base = process.env.VERIFY_PUBLIC_URL;

async function json(path) {
  const response = await fetch(base + path, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const cities = await json('/api/filters/cities');
  if (!Array.isArray(cities)) throw new Error('City filter payload is not an array');

  const expected = new Set(['Зеленоградск', 'Москва', 'Санкт-Петербург']);
  for (const name of expected) {
    if (!cities.some((city) => city?.name === name)) {
      throw new Error(`Canonical public city missing: ${name}`);
    }
  }

  for (const city of cities) {
    if (!city?.name || !isPlausibleCityName(city.name)) {
      throw new Error(`Non-city leaked into public filter: ${city?.name ?? '<empty>'}`);
    }
  }

  const activeCities = await prisma.city.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  for (const city of activeCities) {
    if (!isPlausibleCityName(city.name)) {
      throw new Error(`Invalid active City catalogue row: ${city.name}`);
    }
  }

  const unresolved = await prisma.event.count({
    where: {
      status: 'PUBLISHED',
      format: { in: ['OFFLINE', 'HYBRID'] },
      cityId: null,
    },
  });

  console.log(`PUBLIC_CITY_OPTIONS=${cities.length}`);
  console.log(`ACTIVE_CITY_ROWS=${activeCities.length}`);
  console.log(`LEGACY_UNRESOLVED_PUBLISHED_LOCATIONS=${unresolved}`);
  console.log('CANONICAL_CITY_RUNTIME_OK=true');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
NODE

  echo "PUBLIC_HTTP=$homepage_http"
  echo "HEALTH_HTTP=$health_http"
}

cleanup() {
  set +e
  git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
}

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0
  [ -n "$OLD_BACKEND_IMAGE" ] || return 0

  section "АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND"
  compose_with_backend "$OLD_BACKEND_IMAGE" \
    up -d --no-deps --force-recreate backend || true

  local backend
  backend="$(compose_with_backend "$OLD_BACKEND_IMAGE" ps -q backend 2>/dev/null || true)"
  if [ -n "$backend" ]; then
    wait_backend "$backend" "$OLD_BACKEND_IMAGE" || true
  fi

  if [ -n "$NGINX_BEFORE" ]; then
    reload_nginx "$NGINX_BEFORE" || true
  fi
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "PINNED_BACKEND_DEPLOY_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap cleanup EXIT
trap on_error ERR

section "1. ПРОВЕРКА RELEASE LOCK"
command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v git >/dev/null 2>&1 || fail "git is not installed"
command -v curl >/dev/null 2>&1 || fail "curl is not installed"
test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"
test -d "$ROOT/.git"

available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
echo "AVAILABLE_DISK_KB=$available_kb"
test "$available_kb" -ge "$MIN_FREE_KB"

GIT_STATUS_BEFORE="$(git status --short --untracked-files=all)"
NGINX_CONFIG_SHA_BEFORE="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"

git fetch --no-tags origin \
  "$PRODUCTION_BACKEND_COMMIT" \
  "$PRODUCTION_FRONTEND_COMMIT" \
  "$PRODUCTION_BOTS_COMMIT"
git cat-file -e "${PRODUCTION_BACKEND_COMMIT}^{commit}"
git cat-file -e "${PRODUCTION_FRONTEND_COMMIT}^{commit}"
git cat-file -e "${PRODUCTION_BOTS_COMMIT}^{commit}"

DOCKER_HOST_IPV6="${DOCKER_HOST_IPV6:-$(ip -6 route get 2001:67c:4e8:f004::9 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')}"
[ -n "$DOCKER_HOST_IPV6" ] || fail "cannot determine DOCKER_HOST_IPV6"
export DOCKER_HOST_IPV6

echo "PINNED_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PINNED_FRONTEND_UNCHANGED=$PRODUCTION_FRONTEND_IMAGE"
echo "PINNED_BOTS_UNCHANGED=$PRODUCTION_BOTS_IMAGE"
echo "DOCKER_HOST_IPV6=$DOCKER_HOST_IPV6"

dc config --quiet
build_backend

backend_revision="$(docker image inspect "$PRODUCTION_BACKEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
echo "BACKEND_IMAGE_REVISION=$backend_revision"
test "$backend_revision" = "$PRODUCTION_BACKEND_COMMIT"

docker run --rm --entrypoint sh "$PRODUCTION_BACKEND_IMAGE" -c '
  test -f dist/main.js &&
  test -f dist/modules/events/event-publication-location.service.js &&
  grep -q "активный город из справочника" dist/modules/events/event-publication-location.service.js &&
  grep -q "Город очного участия не определён или требует проверки" dist/modules/max-import/max-parser.service.js &&
  node -e "require(\"@prisma/client\"); require(\"@ab-afisha/shared\")"
'
echo "BACKEND_PREFLIGHT_OK=true"

section "3. ФИКСИРУЕМ ТЕКУЩЕЕ СОСТОЯНИЕ"
old_backend="$(dc ps -q backend)"
FRONTEND_BEFORE="$(dc ps -q frontend)"
BOTS_BEFORE="$(dc ps -q bots)"
NGINX_BEFORE="$(dc ps -q nginx)"
test -n "$old_backend"
test -n "$FRONTEND_BEFORE"
test -n "$BOTS_BEFORE"
test -n "$NGINX_BEFORE"

OLD_BACKEND_IMAGE="$(docker inspect "$old_backend" --format '{{.Config.Image}}')"
FRONTEND_IMAGE_BEFORE="$(docker inspect "$FRONTEND_BEFORE" --format '{{.Config.Image}}')"
BOTS_IMAGE_BEFORE="$(docker inspect "$BOTS_BEFORE" --format '{{.Config.Image}}')"
NGINX_IMAGE_BEFORE="$(docker inspect "$NGINX_BEFORE" --format '{{.Config.Image}}')"

echo "BACKEND_BEFORE=$OLD_BACKEND_IMAGE"
echo "FRONTEND_BEFORE=$FRONTEND_IMAGE_BEFORE"
echo "BOTS_BEFORE=$BOTS_IMAGE_BEFORE"
echo "NGINX_BEFORE=$NGINX_IMAGE_BEFORE"

test "$FRONTEND_IMAGE_BEFORE" = "$PRODUCTION_FRONTEND_IMAGE"
test "$BOTS_IMAGE_BEFORE" = "$PRODUCTION_BOTS_IMAGE"

section "4. ПЕРЕКЛЮЧАЕМ ТОЛЬКО BACKEND"
SWITCHED=1
dc up -d --no-deps --force-recreate backend
new_backend="$(dc ps -q backend)"
test -n "$new_backend"
wait_backend "$new_backend" "$PRODUCTION_BACKEND_IMAGE"
reload_nginx "$NGINX_BEFORE"
echo "PRODUCTION_BACKEND_OK=true"

section "5. TELEGRAM IPv6 И PUBLIC RUNTIME"
telegram_get_me "$new_backend"
verify_public "$new_backend"

section "6. FRONTEND, BOTS, NGINX-CONTAINER И ЛОКАЛЬНЫЕ ФАЙЛЫ НЕ ИЗМЕНЕНЫ"
frontend_after="$(dc ps -q frontend)"
bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"
backend_after="$(dc ps -q backend)"

test "$backend_after" = "$new_backend"
test "$frontend_after" = "$FRONTEND_BEFORE"
test "$bots_after" = "$BOTS_BEFORE"
test "$nginx_after" = "$NGINX_BEFORE"
test "$(docker inspect "$frontend_after" --format '{{.Config.Image}}')" = "$FRONTEND_IMAGE_BEFORE"
test "$(docker inspect "$bots_after" --format '{{.Config.Image}}')" = "$BOTS_IMAGE_BEFORE"
test "$(docker inspect "$nginx_after" --format '{{.Config.Image}}')" = "$NGINX_IMAGE_BEFORE"
test "$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')" = "$NGINX_CONFIG_SHA_BEFORE"
test "$(git status --short --untracked-files=all)" = "$GIT_STATUS_BEFORE"
test "$(docker inspect "$new_backend" --format '{{.Config.Image}}')" = "$PRODUCTION_BACKEND_IMAGE"

SWITCHED=0

printf '\n==========================================\n'
echo "PRODUCTION_BACKEND_PIN_OK=true"
echo "PRODUCTION_RELEASE=$PRODUCTION_RELEASE_COMMIT"
echo "PRODUCTION_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PRODUCTION_FRONTEND=$PRODUCTION_FRONTEND_IMAGE"
echo "PRODUCTION_BOTS=$PRODUCTION_BOTS_IMAGE"
echo "BACKEND_REVISION=$backend_revision"
echo "FRONTEND_UNCHANGED=true"
echo "BOTS_UNCHANGED=true"
echo "NGINX_UNCHANGED=true"
echo "NGINX_CONTAINER_UNCHANGED=true"
echo "LOCAL_CHANGES_PRESERVED=true"
printf '==========================================\n'

dc ps backend frontend bots nginx
