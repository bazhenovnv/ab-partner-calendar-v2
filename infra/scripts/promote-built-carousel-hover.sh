#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://ab-event.pro}"
TARGET="${1:?Usage: promote-built-carousel-hover.sh <40-char-image-revision>}"

if [[ ! "$TARGET" =~ ^[0-9a-f]{40}$ ]]; then
  echo "TARGET must be a full 40-character commit SHA" >&2
  exit 2
fi

SHORT="${TARGET:0:7}"
TAG="carousel-hover-${SHORT}"
IMAGE="ab-afisha/frontend:${TAG}"
PREFLIGHT="ab-afisha-carousel-hover-promote-${SHORT}"
ROLLBACK_TAG="rollback-before-carousel-hover-promote-${SHORT}-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_IMAGE="ab-afisha/frontend:${ROLLBACK_TAG}"
ENV_FILE=""
SWITCHED=0

cd "$ROOT"

dc() {
  docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

section() {
  printf '\n=== %s ===\n' "$1"
}

container_image() {
  docker inspect "$1" --format '{{.Config.Image}}'
}

wait_frontend() {
  local container="$1"
  local expected_image="$2"

  for attempt in $(seq 1 75); do
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

  docker logs --tail 250 "$container" || true
  return 1
}

verify_hover_runtime() {
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
  const page = await fetch(`${baseUrl}?verify=carousel-hover-promotion`);
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

  const compact = css.replace(/\s+/g, '').toLowerCase();
  const finePointerStart = compact.indexOf('@media(hover:hover)and(pointer:fine)');
  const finePointerTail = finePointerStart >= 0
    ? compact.slice(finePointerStart, finePointerStart + 1200)
    : '';
  const transitionPattern = /scale(?:180ms|\.18s)cubic-bezier\((?:0?\.)22,1,(?:0?\.)36,1\)/;
  const notCount = (finePointerTail.match(/:not\(/g) ?? []).length;

  const checks = {
    CAROUSEL_CARD_BASE_SCALE: compact.includes('scale:1'),
    CAROUSEL_HOVER_SCALE_102:
      finePointerTail.includes(':hover') &&
      finePointerTail.includes('scale:1.02'),
    CAROUSEL_HOVER_FINE_POINTER: finePointerStart >= 0,
    CAROUSEL_HOVER_TRANSITION: transitionPattern.test(compact),
    CAROUSEL_DRAG_GUARD:
      finePointerTail.includes(':hover') &&
      notCount >= 2 &&
      finePointerTail.includes('scale:1.02'),
    REDUCED_MOTION_SCALE_RESET:
      compact.includes('@media(prefers-reduced-motion:reduce)') &&
      compact.includes('scale:1'),
    OLD_SCALE_REMOVED: !compact.includes('scale:1.04'),
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
  docker rm -f "$PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "$ENV_FILE" ] || rm -f "$ENV_FILE"
}

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0

  section "АВТОМАТИЧЕСКИЙ ОТКАТ FRONTEND"
  APP_VERSION="$ROLLBACK_TAG" dc up -d --no-deps --force-recreate frontend || true
  local container
  container="$(dc ps -q frontend 2>/dev/null || true)"
  [ -z "$container" ] || wait_frontend "$container" "$ROLLBACK_IMAGE" || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  printf '\n==========================================\n'
  echo "PROMOTION_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap cleanup EXIT
trap on_error ERR

section "1. ПРОВЕРКА СОБРАННОГО ОБРАЗА"

test -f "$COMPOSE_FILE"
docker image inspect "$IMAGE" >/dev/null
revision="$(docker image inspect "$IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$revision" = "$TARGET"
echo "BUILT_IMAGE_OK=$IMAGE"

old_frontend="$(dc ps -q frontend)"
backend_before="$(dc ps -q backend)"
bots_before="$(dc ps -q bots)"
nginx_before="$(dc ps -q nginx)"
test -n "$old_frontend"
test -n "$backend_before"
test -n "$bots_before"
test -n "$nginx_before"

old_frontend_image="$(container_image "$old_frontend")"
backend_image_before="$(container_image "$backend_before")"
bots_image_before="$(container_image "$bots_before")"
nginx_sha_before="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_before="$(git status --short)"

echo "FRONTEND_BEFORE=$old_frontend_image"
echo "BACKEND_BEFORE=$backend_image_before"

section "2. ПОВТОРНЫЙ PREFLIGHT С УЧЁТОМ МИНИФИКАЦИИ"

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
verify_hover_runtime "$PREFLIGHT"
echo "PREFLIGHT_OK"
docker rm -f "$PREFLIGHT" >/dev/null

section "3. ТОЧКА ОТКАТА"

if docker image inspect "$old_frontend_image" >/dev/null 2>&1; then
  docker tag "$old_frontend_image" "$ROLLBACK_IMAGE"
else
  docker commit "$old_frontend" "$ROLLBACK_IMAGE" >/dev/null
fi

docker image inspect "$ROLLBACK_IMAGE" >/dev/null
echo "ROLLBACK_IMAGE=$ROLLBACK_IMAGE"

section "4. ПЕРЕКЛЮЧАЕМ ТОЛЬКО FRONTEND"

SWITCHED=1
APP_VERSION="$TAG" dc up -d --no-deps --force-recreate frontend
new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$IMAGE"
verify_hover_runtime "$new_frontend"
echo "PRODUCTION_HOVER_CONTRACTS_OK"

new_frontend_image="$(container_image "$new_frontend")"
new_revision="$(docker image inspect "$new_frontend_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$new_frontend_image" = "$IMAGE"
test "$new_revision" = "$TARGET"

section "5. ПУБЛИЧНЫЙ HTTP"

public_http=""
for attempt in $(seq 1 25); do
  public_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$PUBLIC_URL/?deploy=${SHORT}&attempt=${attempt}" || true)"
  echo "Public $attempt: HTTP $public_http"
  [ "$public_http" = "200" ] && break
  sleep 2
done
test "$public_http" = "200"

section "6. BACKEND, BOTS И NGINX НЕ ИЗМЕНЕНЫ"

backend_after="$(dc ps -q backend)"
bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"
test "$backend_after" = "$backend_before"
test "$bots_after" = "$bots_before"
test "$nginx_after" = "$nginx_before"
test "$(container_image "$backend_after")" = "$backend_image_before"
test "$(container_image "$bots_after")" = "$bots_image_before"
test "$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')" = "$nginx_sha_before"
test "$(git status --short)" = "$git_status_before"

SWITCHED=0

printf '\n==========================================\n'
echo "DEPLOY_OK"
echo "COMMIT=$TARGET"
echo "PRODUCTION_FRONTEND=$new_frontend_image"
echo "PRODUCTION_REVISION=$new_revision"
echo "PUBLIC_HTTP=$public_http"
echo "CAROUSEL_HOVER_SCALE=1.02"
echo "CAROUSEL_HOVER_DURATION=.18s"
echo "CAROUSEL_GEOMETRY_UNCHANGED=true"
echo "BACKEND_UNCHANGED=$backend_image_before"
echo "BOTS_UNCHANGED=$bots_image_before"
echo "NGINX_PRESERVED=true"
echo "ROLLBACK_IMAGE=$ROLLBACK_IMAGE"
printf '==========================================\n'

dc ps frontend backend bots nginx
