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

: "${PRODUCTION_BACKEND_COMMIT:?missing PRODUCTION_BACKEND_COMMIT}"
: "${PRODUCTION_BACKEND_TAG:?missing PRODUCTION_BACKEND_TAG}"
: "${PRODUCTION_BACKEND_IMAGE:?missing PRODUCTION_BACKEND_IMAGE}"
: "${PRODUCTION_BOTS_COMMIT:?missing PRODUCTION_BOTS_COMMIT}"
: "${PRODUCTION_BOTS_TAG:?missing PRODUCTION_BOTS_TAG}"
: "${PRODUCTION_BOTS_IMAGE:?missing PRODUCTION_BOTS_IMAGE}"
: "${PRODUCTION_FRONTEND_IMAGE:?missing PRODUCTION_FRONTEND_IMAGE}"

[ "$PRODUCTION_BACKEND_IMAGE" = "ab-afisha/backend:${PRODUCTION_BACKEND_TAG}" ] \
  || fail "backend image and tag disagree"
[ "$PRODUCTION_BOTS_IMAGE" = "ab-afisha/bots:${PRODUCTION_BOTS_TAG}" ] \
  || fail "bots image and tag disagree"

cd "$ROOT"

compose_with_images() {
  local backend_image="$1"
  local bots_image="$2"
  local frontend_image="$3"
  shift 3
  BACKEND_IMAGE="$backend_image" \
  BOTS_IMAGE="$bots_image" \
  FRONTEND_IMAGE="$frontend_image" \
    docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

dc() {
  compose_with_images "$PRODUCTION_BACKEND_IMAGE" "$PRODUCTION_BOTS_IMAGE" "$PRODUCTION_FRONTEND_IMAGE" "$@"
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

wait_bots() {
  local container="$1"
  local expected_image="$2"

  for attempt in $(seq 1 60); do
    local state image logs
    state="$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || true)"
    image="$(docker inspect "$container" --format '{{.Config.Image}}' 2>/dev/null || true)"
    logs="$(docker logs --since 5m "$container" 2>&1 || true)"
    echo "Bots $attempt: state=${state:-unknown} image=${image:-unknown}"
    if [ "$state" = "running" ] && [ "$image" = "$expected_image" ] && \
      grep -Fq '[bots] Telegram webhook cleared; long polling can start' <<<"$logs" && \
      grep -Fq '[bots] Bot service ready' <<<"$logs"; then
      return 0
    fi
    sleep 2
  done

  docker logs --tail 250 "$container" || true
  return 1
}

telegram_get_me() {
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
  timeout: 15000,
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

build_image() {
  local component="$1"
  local commit="$2"
  local dockerfile="$3"
  local image="$4"
  local worktree="/srv/ab-afisha-pinned-${component}-${commit:0:7}"

  if docker image inspect "$image" >/dev/null 2>&1; then
    return 0
  fi

  git worktree remove --force "$worktree" >/dev/null 2>&1 || true
  rm -rf "$worktree"
  git worktree add --detach "$worktree" "$commit"
  test "$(git -C "$worktree" rev-parse HEAD)" = "$commit"
  test -z "$(git -C "$worktree" status --porcelain)"

  (
    cd "$worktree"
    DOCKER_BUILDKIT=1 docker build \
      --progress=plain \
      --label "org.opencontainers.image.revision=${commit}" \
      --file "$dockerfile" \
      --tag "$image" \
      .
  )

  git worktree remove --force "$worktree"
  git worktree prune
}

SWITCHED=0
OLD_BACKEND_IMAGE=""
OLD_BOTS_IMAGE=""
FRONTEND_BEFORE=""
NGINX_BEFORE=""

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0
  [ -n "$OLD_BACKEND_IMAGE" ] || return 0
  [ -n "$OLD_BOTS_IMAGE" ] || return 0

  section "АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND + BOTS"
  compose_with_images "$OLD_BACKEND_IMAGE" "$OLD_BOTS_IMAGE" "$PRODUCTION_FRONTEND_IMAGE" \
    up -d --no-deps --force-recreate backend bots || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "PINNED_BACKEND_BOTS_DEPLOY_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap on_error ERR

section "1. ПРОВЕРКА RELEASE LOCK"
command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v git >/dev/null 2>&1 || fail "git is not installed"
command -v curl >/dev/null 2>&1 || fail "curl is not installed"
test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"

available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
echo "AVAILABLE_DISK_KB=$available_kb"
test "$available_kb" -ge "$MIN_FREE_KB"

git fetch --no-tags origin "$PRODUCTION_BACKEND_COMMIT" "$PRODUCTION_BOTS_COMMIT"
git cat-file -e "${PRODUCTION_BACKEND_COMMIT}^{commit}"
git cat-file -e "${PRODUCTION_BOTS_COMMIT}^{commit}"

DOCKER_HOST_IPV6="${DOCKER_HOST_IPV6:-$(ip -6 route get 2001:67c:4e8:f004::9 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')}"
[ -n "$DOCKER_HOST_IPV6" ] || fail "cannot determine DOCKER_HOST_IPV6"
export DOCKER_HOST_IPV6

echo "PINNED_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PINNED_BOTS=$PRODUCTION_BOTS_IMAGE"
echo "PINNED_FRONTEND_UNCHANGED=$PRODUCTION_FRONTEND_IMAGE"
echo "DOCKER_HOST_IPV6=$DOCKER_HOST_IPV6"

dc config --quiet

section "2. СБОРКА PINNED ОБРАЗОВ"
build_image backend "$PRODUCTION_BACKEND_COMMIT" apps/backend/Dockerfile "$PRODUCTION_BACKEND_IMAGE"
build_image bots "$PRODUCTION_BOTS_COMMIT" apps/bots/Dockerfile "$PRODUCTION_BOTS_IMAGE"

backend_revision="$(docker image inspect "$PRODUCTION_BACKEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
bots_revision="$(docker image inspect "$PRODUCTION_BOTS_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
echo "BACKEND_IMAGE_REVISION=$backend_revision"
echo "BOTS_IMAGE_REVISION=$bots_revision"
test "$backend_revision" = "$PRODUCTION_BACKEND_COMMIT"
test "$bots_revision" = "$PRODUCTION_BOTS_COMMIT"

docker run --rm --entrypoint sh "$PRODUCTION_BACKEND_IMAGE" -c \
  'test -f dist/main.js && node -e "require(\"@prisma/client\")"'
docker run --rm --entrypoint sh "$PRODUCTION_BOTS_IMAGE" -c \
  'test -f dist/index.js && node -e "require(\"grammy\")"'
echo "IMAGE_PREFLIGHT_OK=true"

section "3. ФИКСИРУЕМ ТЕКУЩЕЕ СОСТОЯНИЕ"
old_backend="$(dc ps -q backend)"
old_bots="$(dc ps -q bots)"
FRONTEND_BEFORE="$(dc ps -q frontend)"
NGINX_BEFORE="$(dc ps -q nginx)"
test -n "$old_backend"
test -n "$old_bots"
test -n "$FRONTEND_BEFORE"
test -n "$NGINX_BEFORE"
OLD_BACKEND_IMAGE="$(docker inspect "$old_backend" --format '{{.Config.Image}}')"
OLD_BOTS_IMAGE="$(docker inspect "$old_bots" --format '{{.Config.Image}}')"
frontend_image_before="$(docker inspect "$FRONTEND_BEFORE" --format '{{.Config.Image}}')"
nginx_image_before="$(docker inspect "$NGINX_BEFORE" --format '{{.Config.Image}}')"
echo "BACKEND_BEFORE=$OLD_BACKEND_IMAGE"
echo "BOTS_BEFORE=$OLD_BOTS_IMAGE"
echo "FRONTEND_BEFORE=$frontend_image_before"
echo "NGINX_BEFORE=$nginx_image_before"

section "4. ПЕРЕКЛЮЧАЕМ BACKEND"
SWITCHED=1
dc up -d --no-deps --force-recreate backend
new_backend="$(dc ps -q backend)"
test -n "$new_backend"
wait_backend "$new_backend" "$PRODUCTION_BACKEND_IMAGE"
echo "PRODUCTION_BACKEND_OK=true"

section "5. ПЕРЕКЛЮЧАЕМ BOTS"
dc up -d --no-deps --force-recreate bots
new_bots="$(dc ps -q bots)"
test -n "$new_bots"
wait_bots "$new_bots" "$PRODUCTION_BOTS_IMAGE"
telegram_get_me "$new_bots"
echo "PRODUCTION_BOTS_OK=true"

section "6. ПРОВЕРКА BACKEND TELEGRAM IPv6"
telegram_get_me "$new_backend"

section "7. PUBLIC HEALTH"
public_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$PUBLIC_URL/")"
health_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$PUBLIC_URL/api/health")"
echo "PUBLIC_HTTP=$public_http"
echo "HEALTH_HTTP=$health_http"
test "$public_http" = "200"
test "$health_http" = "200"

section "8. FRONTEND + NGINX НЕ ПЕРЕСОЗДАНЫ"
frontend_after="$(dc ps -q frontend)"
nginx_after="$(dc ps -q nginx)"
test "$frontend_after" = "$FRONTEND_BEFORE"
test "$nginx_after" = "$NGINX_BEFORE"
test "$(docker inspect "$frontend_after" --format '{{.Config.Image}}')" = "$frontend_image_before"
test "$(docker inspect "$nginx_after" --format '{{.Config.Image}}')" = "$nginx_image_before"

SWITCHED=0

printf '\n==========================================\n'
echo "PRODUCTION_BACKEND_BOTS_PIN_OK=true"
echo "PRODUCTION_BACKEND=$PRODUCTION_BACKEND_IMAGE"
echo "PRODUCTION_BOTS=$PRODUCTION_BOTS_IMAGE"
echo "PRODUCTION_FRONTEND=$frontend_image_before"
echo "BACKEND_REVISION=$backend_revision"
echo "BOTS_REVISION=$bots_revision"
echo "FRONTEND_UNCHANGED=true"
echo "NGINX_UNCHANGED=true"
printf '==========================================\n'

dc ps backend bots frontend nginx
