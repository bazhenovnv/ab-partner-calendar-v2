#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
IMAGE="${1:-ab-afisha/frontend:frontend-release-4af0425}"
EXPECTED_REVISION="${2:-4af04251c928f44d18e96795b852c1a0a7a91207}"
TAG="${IMAGE##*:}"
PREFLIGHT="ab-afisha-promote-${TAG//[^a-zA-Z0-9_.-]/-}"
ROLLBACK_TAG="rollback-before-${TAG}-$(date +%Y%m%d-%H%M%S)"
ROLLBACK_IMAGE="ab-afisha/frontend:${ROLLBACK_TAG}"
ENV_FILE=""
SWITCHED=0

cd "$ROOT"

dc() {
  docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
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

verify_contracts() {
  local container="$1"

  docker exec -i "$container" node <<'NODE'
const baseUrl = `http://${process.env.HOSTNAME}:3000/`;

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function transparentBackground(body) {
  return /(?:background|background-color):(?:transparent|#0000|rgba\(0,0,0,0\)|0 0)!important/.test(body);
}

function transparentBorder(body) {
  return /border-color:(?:transparent|#0000|rgba\(0,0,0,0\))!important/.test(body);
}

async function main() {
  const page = await fetch(`${baseUrl}?verify=promote-built-frontend`);
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
  const rulePattern = /([^{}]*)\{([^{}]*)\}/g;
  let modalCloseRuleFound = false;
  let match;

  while ((match = rulePattern.exec(compact)) !== null) {
    const body = match[2];
    if (
      transparentBackground(body) &&
      transparentBorder(body) &&
      body.includes('box-shadow:none!important') &&
      body.includes('filter:none!important')
    ) {
      modalCloseRuleFound = true;
      break;
    }
  }

  const checks = {
    SCROLL_RESET_SCRIPT_PRESENT: html.includes('reset-scroll-on-full-page-load'),
    SCROLL_RESTORATION_MANUAL: html.includes('scrollRestoration') && html.includes('manual'),
    CARD_TITLE_THREE_LINES: compact.includes('-webkit-line-clamp:3'),
    MODAL_CLOSE_TRANSPARENT: modalCloseRuleFound,
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
  docker rm -f "$PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "$ENV_FILE" ] || rm -f "$ENV_FILE"
}

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0

  echo "=== АВТОМАТИЧЕСКИЙ ОТКАТ FRONTEND ==="
  APP_VERSION="$ROLLBACK_TAG" dc up -d --no-deps --force-recreate frontend || true

  local rollback_container
  rollback_container="$(dc ps -q frontend 2>/dev/null || true)"
  [ -z "$rollback_container" ] || wait_frontend "$rollback_container" "$ROLLBACK_IMAGE" || true
}

on_error() {
  local rc=$?
  trap - ERR
  set +e
  echo "=========================================="
  echo "DEPLOY_FAILED"
  echo "EXIT_CODE=$rc"
  echo "=========================================="
  rollback
  exit "$rc"
}

trap cleanup EXIT
trap on_error ERR

test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"
docker image inspect "$IMAGE" >/dev/null

revision="$(docker image inspect "$IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
echo "IMAGE=$IMAGE"
echo "IMAGE_REVISION=$revision"
test "$revision" = "$EXPECTED_REVISION"

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
verify_contracts "$PREFLIGHT"
echo "PREFLIGHT_OK"
docker rm -f "$PREFLIGHT" >/dev/null

if docker image inspect "$old_frontend_image" >/dev/null 2>&1; then
  docker tag "$old_frontend_image" "$ROLLBACK_IMAGE"
else
  docker commit "$old_frontend" "$ROLLBACK_IMAGE" >/dev/null
fi

docker image inspect "$ROLLBACK_IMAGE" >/dev/null
echo "ROLLBACK_IMAGE=$ROLLBACK_IMAGE"

SWITCHED=1
APP_VERSION="$TAG" dc up -d --no-deps --force-recreate frontend

new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$IMAGE"
verify_contracts "$new_frontend"
echo "PRODUCTION_CONTRACTS_OK"

new_frontend_image="$(docker inspect "$new_frontend" --format '{{.Config.Image}}')"
new_revision="$(docker image inspect "$new_frontend_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$new_frontend_image" = "$IMAGE"
test "$new_revision" = "$EXPECTED_REVISION"

public_http=""
for attempt in $(seq 1 20); do
  public_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' 'https://ab-event.pro/?deploy=4af0425' || true)"
  echo "Public $attempt: HTTP $public_http"
  [ "$public_http" = "200" ] && break
  sleep 2
done

test "$public_http" = "200"

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

echo "=========================================="
echo "DEPLOY_OK"
echo "PRODUCTION_FRONTEND=$new_frontend_image"
echo "PRODUCTION_REVISION=$new_revision"
echo "PUBLIC_HTTP=$public_http"
echo "CARD_TITLE_LINES=3"
echo "MODAL_CLOSE_BACKGROUND=transparent"
echo "MODAL_METADATA_LIFT=one-facts-panel-height"
echo "PAGE_REFRESH_SCROLL=top"
echo "BACKEND_UNCHANGED=$backend_image_before"
echo "BOTS_UNCHANGED=$bots_image_before"
echo "NGINX_PRESERVED=true"
echo "=========================================="

dc ps frontend backend bots nginx
