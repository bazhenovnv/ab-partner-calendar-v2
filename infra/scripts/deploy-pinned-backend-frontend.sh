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
: "${PRODUCTION_BOTS_COMMIT:?missing PRODUCTION_BOTS_COMMIT}"
: "${PRODUCTION_BOTS_TAG:?missing PRODUCTION_BOTS_TAG}"
: "${PRODUCTION_BOTS_IMAGE:?missing PRODUCTION_BOTS_IMAGE}"
: "${PRODUCTION_FRONTEND_COMMIT:?missing PRODUCTION_FRONTEND_COMMIT}"
: "${PRODUCTION_FRONTEND_TAG:?missing PRODUCTION_FRONTEND_TAG}"
: "${PRODUCTION_FRONTEND_IMAGE:?missing PRODUCTION_FRONTEND_IMAGE}"

[ "$PRODUCTION_BACKEND_COMMIT" = "$PRODUCTION_RELEASE_COMMIT" ] \
  || fail "backend commit differs from release anchor"
[ "$PRODUCTION_FRONTEND_COMMIT" = "$PRODUCTION_RELEASE_COMMIT" ] \
  || fail "frontend commit differs from release anchor"
[ "$PRODUCTION_BACKEND_IMAGE" = "ab-afisha/backend:${PRODUCTION_BACKEND_TAG}" ] \
  || fail "backend image and tag disagree"
[ "$PRODUCTION_BOTS_IMAGE" = "ab-afisha/bots:${PRODUCTION_BOTS_TAG}" ] \
  || fail "bots image and tag disagree"
[ "$PRODUCTION_FRONTEND_IMAGE" = "ab-afisha/frontend:${PRODUCTION_FRONTEND_TAG}" ] \
  || fail "frontend image and tag disagree"

SHORT="${PRODUCTION_RELEASE_COMMIT:0:7}"
WORKTREE="/srv/ab-afisha-backend-frontend-${SHORT}"
FRONTEND_PREFLIGHT="ab-afisha-frontend-preflight-${SHORT}"
FRONTEND_ENV_FILE=""
SWITCHED=0
OLD_BACKEND_IMAGE=""
OLD_FRONTEND_IMAGE=""
BOTS_BEFORE=""
NGINX_BEFORE=""
BOTS_IMAGE_BEFORE=""
NGINX_IMAGE_BEFORE=""
NGINX_CONFIG_SHA_BEFORE=""
GIT_STATUS_BEFORE=""

cd "$ROOT"

compose_with_images() {
  local backend_image="$1"
  local frontend_image="$2"
  local bots_image="$3"
  shift 3
  BACKEND_IMAGE="$backend_image" \
  FRONTEND_IMAGE="$frontend_image" \
  BOTS_IMAGE="$bots_image" \
    docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

dc() {
  compose_with_images \
    "$PRODUCTION_BACKEND_IMAGE" \
    "$PRODUCTION_FRONTEND_IMAGE" \
    "$PRODUCTION_BOTS_IMAGE" \
    "$@"
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

  section "2. СБОРКА ЗАКРЕПЛЁННЫХ BACKEND И FRONTEND"

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

verify_city_filter() {
  local backend_container="$1"

  docker exec -e VERIFY_PUBLIC_URL="$PUBLIC_URL" -i "$backend_container" node <<'NODE'
const base = process.env.VERIFY_PUBLIC_URL;

async function json(path) {
  const response = await fetch(base + path, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

function normalized(value) {
  return String(value ?? '')
    .trim()
    .replace(/^(?:г\.|город)\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru');
}

async function main() {
  const cities = await json('/api/filters/cities');
  if (!Array.isArray(cities)) throw new Error('City filter payload is not an array');

  const forbiddenExact = new Set([
    'онлайн',
    'online',
    'очно',
    'офлайн',
    'offline',
    'дистанционно',
    'экспофорум',
    'ст1',
  ]);

  for (const city of cities) {
    if (!city || typeof city.name !== 'string' || !city.name.trim()) {
      throw new Error('City option without a valid name');
    }
    if (forbiddenExact.has(normalized(city.name))) {
      throw new Error(`Non-city leaked into public filter: ${city.name}`);
    }
    if (!Array.isArray(city.filterValues) || city.filterValues.length === 0) {
      throw new Error(`City option has no filterValues: ${city.name}`);
    }
  }

  const moscow = cities.find((city) => normalized(city.name) === 'москва');
  if (!moscow) throw new Error('Canonical Moscow option is missing');

  const params = new URLSearchParams({ page: '1', limit: '6' });
  for (const value of moscow.filterValues) params.append('cities', value);
  for (const status of ['PLANNED', 'LIVE', 'COMPLETED']) params.append('autoStatus', status);

  const events = await json(`/api/events/public?${params.toString()}`);
  if (!events || !Array.isArray(events.events) || Number(events.total) < 1) {
    throw new Error('Moscow filter option does not resolve to any published event');
  }

  console.log(`PUBLIC_CITY_OPTIONS=${cities.length}`);
  console.log(`MOSCOW_FILTER_VALUES=${moscow.filterValues.length}`);
  console.log(`MOSCOW_FILTER_EVENTS_TOTAL=${events.total}`);
  console.log('CITY_FILTER_CANONICALIZATION_OK=true');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
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
  verify_city_filter "$backend_container"

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
  compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" "$BOTS_IMAGE_BEFORE" \
    up -d --no-deps --force-recreate backend frontend || true

  local backend frontend
  backend="$(compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" "$BOTS_IMAGE_BEFORE" ps -q backend 2>/dev/null || true)"
  frontend="$(compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" "$BOTS_IMAGE_BEFORE" ps -q frontend 2>/dev/null || true)"
  [ -z "$backend" ] || wait_backend "$backend" "$OLD_BACKEND_IMAGE" || true
  [ -z "$frontend" ] || wait_frontend "$frontend" "$OLD_FRONTEND_IMAGE" || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "PINNED_BACKEND_FRONTEND_DEPLOY_FAILED"
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

GIT_STATUS_BEFORE="$(git status --short --untracked-files=all)"

# Fetch only the approved component commit. Do not move production root HEAD.
git fetch --no-tags origin "$PRODUCTION_RELEASE_COMMIT"
git cat-file -e "${PRODUCTION_RELEASE_COMMIT}^{commit}"

echo "PINNED_COMMIT=$PRODUCTION_RELEASE_COMMIT"
echo "PINNED_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PINNED_FRONTEND=$PRODUCTION_FRONTEND_IMAGE"
echo "PINNED_BOTS_UNCHANGED=$PRODUCTION_BOTS_IMAGE"

dc config --quiet

build_images

backend_revision="$(docker image inspect "$PRODUCTION_BACKEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
frontend_revision="$(docker image inspect "$PRODUCTION_FRONTEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
echo "BACKEND_IMAGE_REVISION=$backend_revision"
echo "FRONTEND_IMAGE_REVISION=$frontend_revision"
test "$backend_revision" = "$PRODUCTION_BACKEND_COMMIT"
test "$frontend_revision" = "$PRODUCTION_FRONTEND_COMMIT"

section "3. PREFLIGHT И СОХРАНЕНИЕ ТЕКУЩЕГО СОСТОЯНИЯ"

old_backend="$(dc ps -q backend)"
old_frontend="$(dc ps -q frontend)"
BOTS_BEFORE="$(dc ps -q bots)"
NGINX_BEFORE="$(dc ps -q nginx)"

test -n "$old_backend"
test -n "$old_frontend"
test -n "$BOTS_BEFORE"
test -n "$NGINX_BEFORE"

OLD_BACKEND_IMAGE="$(docker inspect "$old_backend" --format '{{.Config.Image}}')"
OLD_FRONTEND_IMAGE="$(docker inspect "$old_frontend" --format '{{.Config.Image}}')"
BOTS_IMAGE_BEFORE="$(docker inspect "$BOTS_BEFORE" --format '{{.Config.Image}}')"
NGINX_IMAGE_BEFORE="$(docker inspect "$NGINX_BEFORE" --format '{{.Config.Image}}')"
NGINX_CONFIG_SHA_BEFORE="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"

echo "BACKEND_BEFORE=$OLD_BACKEND_IMAGE"
echo "FRONTEND_BEFORE=$OLD_FRONTEND_IMAGE"
echo "BOTS_BEFORE=$BOTS_IMAGE_BEFORE"
echo "NGINX_BEFORE=$NGINX_IMAGE_BEFORE"

test "$BOTS_IMAGE_BEFORE" = "$PRODUCTION_BOTS_IMAGE"

docker run --rm --entrypoint sh "$PRODUCTION_BACKEND_IMAGE" -c \
  'test -f dist/main.js && test -f /etc/ssl/certs/ca-certificates.crt && node -e "require(\"@prisma/client\")"'
echo "BACKEND_PREFLIGHT_OK=true"

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
echo "FRONTEND_PREFLIGHT_OK=true"

section "4. ПЕРЕКЛЮЧАЕМ BACKEND"

SWITCHED=1
compose_with_images "$PRODUCTION_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" "$PRODUCTION_BOTS_IMAGE" \
  up -d --no-deps --force-recreate backend
new_backend="$(compose_with_images "$PRODUCTION_BACKEND_IMAGE" "$OLD_FRONTEND_IMAGE" "$PRODUCTION_BOTS_IMAGE" ps -q backend)"
test -n "$new_backend"
wait_backend "$new_backend" "$PRODUCTION_BACKEND_IMAGE"
echo "PRODUCTION_BACKEND_OK=true"

section "5. ПЕРЕКЛЮЧАЕМ FRONTEND"

dc up -d --no-deps --force-recreate frontend
new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$PRODUCTION_FRONTEND_IMAGE"
echo "PRODUCTION_FRONTEND_OK=true"

section "6. ПУБЛИЧНАЯ ПРОВЕРКА"
verify_public "$new_backend"

section "7. BOTS, NGINX И ЛОКАЛЬНЫЕ ФАЙЛЫ НЕ ИЗМЕНЕНЫ"

bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"
backend_after="$(dc ps -q backend)"
frontend_after="$(dc ps -q frontend)"

test "$backend_after" = "$new_backend"
test "$frontend_after" = "$new_frontend"
test "$bots_after" = "$BOTS_BEFORE"
test "$nginx_after" = "$NGINX_BEFORE"
test "$(docker inspect "$bots_after" --format '{{.Config.Image}}')" = "$BOTS_IMAGE_BEFORE"
test "$(docker inspect "$nginx_after" --format '{{.Config.Image}}')" = "$NGINX_IMAGE_BEFORE"
test "$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')" = "$NGINX_CONFIG_SHA_BEFORE"
test "$(git status --short --untracked-files=all)" = "$GIT_STATUS_BEFORE"

test "$(docker inspect "$new_backend" --format '{{.Config.Image}}')" = "$PRODUCTION_BACKEND_IMAGE"
test "$(docker inspect "$new_frontend" --format '{{.Config.Image}}')" = "$PRODUCTION_FRONTEND_IMAGE"

SWITCHED=0

printf '\n==========================================\n'
echo "PRODUCTION_BACKEND_FRONTEND_PIN_OK=true"
echo "PRODUCTION_COMMIT=$PRODUCTION_RELEASE_COMMIT"
echo "PRODUCTION_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PRODUCTION_FRONTEND=$PRODUCTION_FRONTEND_IMAGE"
echo "PRODUCTION_BOTS=$PRODUCTION_BOTS_IMAGE"
echo "BACKEND_REVISION=$backend_revision"
echo "FRONTEND_REVISION=$frontend_revision"
echo "BOTS_UNCHANGED=true"
echo "NGINX_UNCHANGED=true"
echo "LOCAL_CHANGES_PRESERVED=true"
printf '==========================================\n'

dc ps backend frontend bots nginx
