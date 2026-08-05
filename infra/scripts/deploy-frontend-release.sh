#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
TARGET_INPUT="${1:-origin/main}"
MIN_FREE_KB="${MIN_FREE_KB:-4194304}"

cd "$ROOT"

dc() {
  docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

log_section() {
  printf '\n=== %s ===\n' "$1"
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

verify_release_contracts() {
  local container="$1"

  docker exec -i "$container" node <<'NODE'
const baseUrl = `http://${process.env.HOSTNAME}:3000/`;

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

async function main() {
  const page = await fetch(`${baseUrl}?verify=frontend-release`);
  if (page.status !== 200) {
    throw new Error(`Homepage returned HTTP ${page.status}`);
  }

  const html = await page.text();
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const cssUrls = [];

  for (const link of links) {
    const rel = attribute(link, 'rel');
    const href = attribute(link, 'href');
    if (href && rel?.split(/\s+/).includes('stylesheet')) {
      cssUrls.push(new URL(href, baseUrl).toString());
    }
  }

  if (cssUrls.length === 0) {
    throw new Error('No stylesheet links found');
  }

  let css = '';
  for (const url of cssUrls) {
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(`${url} returned HTTP ${response.status}`);
    }
    css += `\n${await response.text()}`;
  }

  const compact = css.replace(/\s+/g, '');
  const checks = {
    SCROLL_RESET_SCRIPT_PRESENT: html.includes('reset-scroll-on-full-page-load'),
    SCROLL_RESTORATION_MANUAL: html.includes('scrollRestoration') && html.includes('manual'),
    CARD_TITLE_THREE_LINES: compact.includes('-webkit-line-clamp:3'),
    MODAL_CLOSE_TRANSPARENT:
      compact.includes('button[aria-label="Закрыть"]') &&
      compact.includes('background-color:transparent!important') &&
      compact.includes('box-shadow:none!important') &&
      compact.includes('filter:none!important'),
    MODAL_METADATA_RAISED:
      compact.includes('padding-bottom:calc(clamp(58px,3.542vw,68px)+10px)!important'),
    DATE_BADGE_QUARTER_OVERLAP: compact.includes('top:-24.25px!important'),
    PLANNED_STATUS_COLOR: compact.includes('background:#7cd8b3!important'),
    LIVE_STATUS_COLOR: compact.includes('background:#ffdb99!important'),
    COMPLETED_STATUS_COLOR: compact.includes('background:#a3a3a3!important'),
  };

  let failed = false;
  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}=${passed}`);
    if (!passed) failed = true;
  }

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
}

cleanup() {
  set +e
  [ -z "${PREFLIGHT:-}" ] || docker rm -f "$PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "${ENV_FILE:-}" ] || rm -f "$ENV_FILE"
  [ -z "${WORKTREE:-}" ] || git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  [ -z "${WORKTREE:-}" ] || rm -rf "$WORKTREE"
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
}

rollback() {
  set +e
  [ "${SWITCHED:-0}" -eq 1 ] || return 0

  log_section "АВТОМАТИЧЕСКИЙ ОТКАТ FRONTEND"
  echo "ROLLBACK_IMAGE=$ROLLBACK_IMAGE"

  APP_VERSION="$ROLLBACK_TAG" dc up -d --no-deps --force-recreate frontend || true
  local rollback_container
  rollback_container="$(dc ps -q frontend 2>/dev/null || true)"
  [ -z "$rollback_container" ] || wait_frontend "$rollback_container" "$ROLLBACK_IMAGE" || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "DEPLOY_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap cleanup EXIT
trap on_error ERR

SWITCHED=0
ENV_FILE=""
WORKTREE=""
PREFLIGHT=""

log_section "1. PREFLIGHT СЕРВЕРА"

test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"

available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
echo "AVAILABLE_DISK_KB=$available_kb"
test "$available_kb" -ge "$MIN_FREE_KB"

old_frontend="$(dc ps -q frontend)"
backend_before="$(dc ps -q backend)"
bots_before="$(dc ps -q bots)"
nginx_before="$(dc ps -q nginx)"

test -n "$old_frontend"
test -n "$backend_before"
test -n "$bots_before"
test -n "$nginx_before"

old_frontend_image="$(docker inspect "$old_frontend" --format '{{.Config.Image}}')"
backend_image_before="$(docker inspect "$backend_before" --format '{{.Config.Image}}')"
bots_image_before="$(docker inspect "$bots_before" --format '{{.Config.Image}}')"
nginx_sha_before="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_before="$(git status --short)"

echo "FRONTEND_BEFORE=$old_frontend_image"
echo "BACKEND_BEFORE=$backend_image_before"
echo "BOTS_BEFORE=$bots_image_before"

log_section "2. TARGET И ЧИСТЫЙ WORKTREE"

git fetch --prune origin main
TARGET="$(git rev-parse "$TARGET_INPUT")"
ORIGIN_MAIN="$(git rev-parse origin/main)"
SHORT="${TARGET:0:7}"
TAG="frontend-release-${SHORT}"
IMAGE="ab-afisha/frontend:${TAG}"
WORKTREE="/srv/ab-afisha-release-${SHORT}"
PREFLIGHT="ab-afisha-preflight-${SHORT}"
ROLLBACK_TAG="rollback-before-${SHORT}-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_IMAGE="ab-afisha/frontend:${ROLLBACK_TAG}"

echo "TARGET=$TARGET"
echo "ORIGIN_MAIN=$ORIGIN_MAIN"
echo "FRONTEND_TARGET=$IMAGE"

test "$TARGET" = "$ORIGIN_MAIN"
git cat-file -e "${TARGET}^{commit}"

git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
rm -rf "$WORKTREE"
git worktree add --detach "$WORKTREE" "$TARGET"
test "$(git -C "$WORKTREE" rev-parse HEAD)" = "$TARGET"
test -z "$(git -C "$WORKTREE" status --porcelain)"

echo "WORKTREE_CLEAN=true"

log_section "3. SOURCE-КОНТРАКТЫ"

grep -F -- '-webkit-line-clamp: 3;' "$WORKTREE/apps/frontend/src/components/events/event-interactions.module.css"
grep -F 'background-color: transparent !important;' "$WORKTREE/apps/frontend/src/app/modal-close-spacing-scroll-final.css"
grep -F 'padding-bottom: calc(clamp(58px, 3.542vw, 68px) + 10px) !important;' "$WORKTREE/apps/frontend/src/app/modal-close-spacing-scroll-final.css"
grep -F 'reset-scroll-on-full-page-load' "$WORKTREE/apps/frontend/src/app/layout.tsx"
grep -F "window.history.scrollRestoration = 'manual';" "$WORKTREE/apps/frontend/src/app/layout.tsx"

echo "SOURCE_CONTRACTS_OK"

log_section "4. TYPECHECK И ВСЕ FRONTEND-ТЕСТЫ"

docker run --rm \
  -v "$WORKTREE:/work" \
  -w /work \
  node:20-alpine \
  sh -lc '
    set -eu
    npm install --global pnpm@9.15.0 >/dev/null
    pnpm install --frozen-lockfile --ignore-scripts
    pnpm --filter frontend typecheck
    node --test apps/frontend/test/*.test.mjs
  '

echo "CHECKS_OK"

log_section "5. BUILD FRONTEND"

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

declare -a build_args=()
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

cd "$WORKTREE"
DOCKER_BUILDKIT=1 docker build \
  --progress=plain \
  --label "org.opencontainers.image.revision=${TARGET}" \
  "${build_args[@]}" \
  --file apps/frontend/Dockerfile \
  --tag "$IMAGE" \
  .

built_revision="$(docker image inspect "$IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$built_revision" = "$TARGET"

echo "BUILT_IMAGE=$IMAGE"

log_section "6. PREFLIGHT ОБРАЗА"

cd "$ROOT"
ENV_FILE="$(mktemp)"
chmod 600 "$ENV_FILE"
docker inspect "$old_frontend" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -v '^HOSTNAME=' >"$ENV_FILE"

docker rm -f "$PREFLIGHT" >/dev/null 2>&1 || true
docker run -d \
  --name "$PREFLIGHT" \
  --network ab-afisha_default \
  --env-file "$ENV_FILE" \
  "$IMAGE" \
  >/dev/null

wait_frontend "$PREFLIGHT" "$IMAGE"
verify_release_contracts "$PREFLIGHT"

echo "PREFLIGHT_OK"
docker rm -f "$PREFLIGHT" >/dev/null

log_section "7. ТОЧКА ОТКАТА"

if docker image inspect "$old_frontend_image" >/dev/null 2>&1; then
  docker tag "$old_frontend_image" "$ROLLBACK_IMAGE"
else
  docker commit "$old_frontend" "$ROLLBACK_IMAGE" >/dev/null
fi

docker image inspect "$ROLLBACK_IMAGE" >/dev/null
echo "ROLLBACK_IMAGE=$ROLLBACK_IMAGE"

log_section "8. ПЕРЕКЛЮЧАЕМ ТОЛЬКО FRONTEND"

SWITCHED=1
APP_VERSION="$TAG" dc up -d --no-deps --force-recreate frontend

new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$IMAGE"

new_frontend_image="$(docker inspect "$new_frontend" --format '{{.Config.Image}}')"
new_revision="$(docker image inspect "$new_frontend_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$new_frontend_image" = "$IMAGE"
test "$new_revision" = "$TARGET"

verify_release_contracts "$new_frontend"
echo "PRODUCTION_CONTRACTS_OK"

log_section "9. ПУБЛИЧНЫЙ HTTP"

public_http=""
for attempt in $(seq 1 20); do
  public_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://ab-event.pro/?deploy=${SHORT}" || true)"
  echo "Public $attempt: HTTP $public_http"
  [ "$public_http" = "200" ] && break
  sleep 2
done

test "$public_http" = "200"

log_section "10. ОСТАЛЬНЫЕ СЕРВИСЫ НЕ ИЗМЕНЕНЫ"

backend_after="$(dc ps -q backend)"
bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"

test "$backend_after" = "$backend_before"
test "$bots_after" = "$bots_before"
test "$nginx_after" = "$nginx_before"

backend_image_after="$(docker inspect "$backend_after" --format '{{.Config.Image}}')"
bots_image_after="$(docker inspect "$bots_after" --format '{{.Config.Image}}')"
nginx_sha_after="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_after="$(git status --short)"

test "$backend_image_after" = "$backend_image_before"
test "$bots_image_after" = "$bots_image_before"
test "$nginx_sha_after" = "$nginx_sha_before"
test "$git_status_after" = "$git_status_before"

SWITCHED=0

printf '\n==========================================\n'
echo "DEPLOY_OK"
echo "COMMIT=$TARGET"
echo "PRODUCTION_FRONTEND=$new_frontend_image"
echo "PRODUCTION_REVISION=$new_revision"
echo "PUBLIC_HTTP=$public_http"
echo "CARD_TITLE_LINES=3"
echo "MODAL_CLOSE_BACKGROUND=transparent"
echo "MODAL_METADATA_LIFT=one-facts-panel-height"
echo "PAGE_REFRESH_SCROLL=top"
echo "BACKEND_UNCHANGED=$backend_image_after"
echo "BOTS_UNCHANGED=$bots_image_after"
echo "NGINX_PRESERVED=true"
printf '==========================================\n'

dc ps frontend backend bots nginx
