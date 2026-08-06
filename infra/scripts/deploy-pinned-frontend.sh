#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
LOCK_FILE="${LOCK_FILE:-$ROOT/infra/deploy/production-frontend.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
MIN_FREE_KB="${MIN_FREE_KB:-4194304}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

log_section() {
  printf '\n=== %s ===\n' "$1"
}

[ -f "$LOCK_FILE" ] || fail "production lock is missing: $LOCK_FILE"
# shellcheck disable=SC1090
source "$LOCK_FILE"

: "${PRODUCTION_FRONTEND_COMMIT:?missing PRODUCTION_FRONTEND_COMMIT}"
: "${PRODUCTION_FRONTEND_TAG:?missing PRODUCTION_FRONTEND_TAG}"
: "${PRODUCTION_FRONTEND_IMAGE:?missing PRODUCTION_FRONTEND_IMAGE}"

SHORT="${PRODUCTION_FRONTEND_COMMIT:0:7}"
EXPECTED_IMAGE="ab-afisha/frontend:${PRODUCTION_FRONTEND_TAG}"
[ "$PRODUCTION_FRONTEND_IMAGE" = "$EXPECTED_IMAGE" ] \
  || fail "lock image and tag disagree"

cd "$ROOT"

compose_with_image() {
  local image="$1"
  shift
  FRONTEND_IMAGE="$image" docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

dc() {
  compose_with_image "$PRODUCTION_FRONTEND_IMAGE" "$@"
}

wait_frontend() {
  local container="$1"
  local expected_image="$2"

  for attempt in $(seq 1 60); do
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

    sleep 1
  done

  docker logs --tail 200 "$container" || true
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

build_pinned_image() {
  local worktree="/srv/ab-afisha-pinned-${SHORT}"
  local -a build_args=()

  log_section "СБОРКА ЗАКРЕПЛЁННОГО ОБРАЗА"

  git worktree remove --force "$worktree" >/dev/null 2>&1 || true
  rm -rf "$worktree"
  git worktree add --detach "$worktree" "$PRODUCTION_FRONTEND_COMMIT"
  test "$(git -C "$worktree" rev-parse HEAD)" = "$PRODUCTION_FRONTEND_COMMIT"
  test -z "$(git -C "$worktree" status --porcelain)"

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
    [ -z "$value" ] || build_args+=(--build-arg "${key}=${value}")
  done

  (
    cd "$worktree"
    DOCKER_BUILDKIT=1 docker build \
      --progress=plain \
      --label "org.opencontainers.image.revision=${PRODUCTION_FRONTEND_COMMIT}" \
      "${build_args[@]}" \
      --file apps/frontend/Dockerfile \
      --tag "$PRODUCTION_FRONTEND_IMAGE" \
      .
  )

  git worktree remove --force "$worktree"
  git worktree prune
}

PREFLIGHT="ab-afisha-pinned-preflight-${SHORT}"
ENV_FILE=""
WORKTREE=""
SWITCHED=0
OLD_FRONTEND_IMAGE=""
OLD_FRONTEND_CONTAINER=""

cleanup() {
  set +e
  docker rm -f "$PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "$ENV_FILE" ] || rm -f "$ENV_FILE"
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
}

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0
  [ -n "$OLD_FRONTEND_IMAGE" ] || return 0

  log_section "АВТОМАТИЧЕСКИЙ ОТКАТ FRONTEND"
  echo "ROLLBACK_IMAGE=$OLD_FRONTEND_IMAGE"
  compose_with_image "$OLD_FRONTEND_IMAGE" up -d --no-deps --force-recreate frontend || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "PINNED_DEPLOY_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap cleanup EXIT
trap on_error ERR

log_section "1. ПРОВЕРКА ЗАКРЕПЛЁННОГО РЕЛИЗА"

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
command -v git >/dev/null 2>&1 || fail "git is not installed"
test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"

docker compose -p ab-afisha -f "$COMPOSE_FILE" config --quiet

available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
echo "AVAILABLE_DISK_KB=$available_kb"
test "$available_kb" -ge "$MIN_FREE_KB"

git fetch --prune origin

git cat-file -e "${PRODUCTION_FRONTEND_COMMIT}^{commit}"
echo "PINNED_COMMIT=$PRODUCTION_FRONTEND_COMMIT"
echo "PINNED_IMAGE=$PRODUCTION_FRONTEND_IMAGE"

if ! docker image inspect "$PRODUCTION_FRONTEND_IMAGE" >/dev/null 2>&1; then
  build_pinned_image
fi

image_revision="$(docker image inspect "$PRODUCTION_FRONTEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
echo "IMAGE_REVISION=$image_revision"
test "$image_revision" = "$PRODUCTION_FRONTEND_COMMIT"

log_section "2. PREFLIGHT ОБРАЗА"

OLD_FRONTEND_CONTAINER="$(dc ps -q frontend)"
backend_before="$(dc ps -q backend)"
bots_before="$(dc ps -q bots)"
nginx_before="$(dc ps -q nginx)"

test -n "$OLD_FRONTEND_CONTAINER"
test -n "$backend_before"
test -n "$bots_before"
test -n "$nginx_before"

OLD_FRONTEND_IMAGE="$(docker inspect "$OLD_FRONTEND_CONTAINER" --format '{{.Config.Image}}')"
backend_image_before="$(docker inspect "$backend_before" --format '{{.Config.Image}}')"
bots_image_before="$(docker inspect "$bots_before" --format '{{.Config.Image}}')"
nginx_sha_before="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_before="$(git status --short)"

echo "FRONTEND_BEFORE=$OLD_FRONTEND_IMAGE"
echo "BACKEND_BEFORE=$backend_image_before"
echo "BOTS_BEFORE=$bots_image_before"

ENV_FILE="$(mktemp)"
chmod 600 "$ENV_FILE"
docker inspect "$OLD_FRONTEND_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -v '^HOSTNAME=' >"$ENV_FILE"

docker rm -f "$PREFLIGHT" >/dev/null 2>&1 || true
docker run -d \
  --name "$PREFLIGHT" \
  --network ab-afisha_default \
  --env-file "$ENV_FILE" \
  "$PRODUCTION_FRONTEND_IMAGE" \
  >/dev/null

wait_frontend "$PREFLIGHT" "$PRODUCTION_FRONTEND_IMAGE"
echo "PREFLIGHT_OK"
docker rm -f "$PREFLIGHT" >/dev/null

log_section "3. ПЕРЕКЛЮЧАЕМ ТОЛЬКО FRONTEND"

SWITCHED=1
dc up -d --no-deps --force-recreate frontend

new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$PRODUCTION_FRONTEND_IMAGE"

new_frontend_image="$(docker inspect "$new_frontend" --format '{{.Config.Image}}')"
new_revision="$(docker image inspect "$new_frontend_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$new_frontend_image" = "$PRODUCTION_FRONTEND_IMAGE"
test "$new_revision" = "$PRODUCTION_FRONTEND_COMMIT"

log_section "4. ПУБЛИЧНАЯ ПРОВЕРКА"

public_http=""
for attempt in $(seq 1 20); do
  public_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://ab-event.pro/?pinned=${SHORT}" || true)"
  echo "Public $attempt: HTTP $public_http"
  [ "$public_http" = "200" ] && break
  sleep 2
done

test "$public_http" = "200"

log_section "5. ОСТАЛЬНЫЕ СЕРВИСЫ НЕ ИЗМЕНЕНЫ"

backend_after="$(dc ps -q backend)"
bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"

test "$backend_after" = "$backend_before"
test "$bots_after" = "$bots_before"
test "$nginx_after" = "$nginx_before"
test "$(docker inspect "$backend_after" --format '{{.Config.Image}}')" = "$backend_image_before"
test "$(docker inspect "$bots_after" --format '{{.Config.Image}}')" = "$bots_image_before"
test "$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')" = "$nginx_sha_before"
test "$(git status --short)" = "$git_status_before"

SWITCHED=0

printf '\n==========================================\n'
echo "PRODUCTION_PIN_OK"
echo "PRODUCTION_COMMIT=$PRODUCTION_FRONTEND_COMMIT"
echo "PRODUCTION_FRONTEND=$new_frontend_image"
echo "PRODUCTION_REVISION=$new_revision"
echo "PUBLIC_HTTP=$public_http"
echo "BACKEND_UNCHANGED=$backend_image_before"
echo "BOTS_UNCHANGED=$bots_image_before"
echo "NGINX_PRESERVED=true"
printf '==========================================\n'

dc ps frontend backend bots nginx
