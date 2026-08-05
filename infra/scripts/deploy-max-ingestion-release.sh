#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
TARGET_INPUT="${1:-origin/main}"
MIN_FREE_KB="${MIN_FREE_KB:-5242880}"
PUBLIC_URL="${PUBLIC_URL:-https://ab-event.pro}"

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

wait_startup_reconciliation() {
  local container="$1"

  for attempt in $(seq 1 90); do
    local logs line
    logs="$(docker logs --since 10m "$container" 2>&1 || true)"
    line="$(grep -F 'MAX startup reconciliation finished:' <<<"$logs" | tail -n 1 || true)"

    if [ -n "$line" ]; then
      echo "$line"
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

verify_frontend_runtime() {
  local container="$1"

  docker exec -i "$container" node <<'NODE'
const baseUrl = `http://${process.env.HOSTNAME}:3000/`;

async function main() {
  const response = await fetch(`${baseUrl}?verify=max-ingestion-release`);
  if (response.status !== 200) {
    throw new Error(`Homepage returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const checks = {
    HOMEPAGE_OK: html.length > 1000,
    SCROLL_RESET_PRESENT: html.includes('reset-scroll-on-full-page-load'),
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

verify_public_api() {
  local backend_container="$1"
  local base_url="$2"

  docker exec -e VERIFY_PUBLIC_URL="$base_url" -i "$backend_container" node <<'NODE'
const base = process.env.VERIFY_PUBLIC_URL;

async function json(path) {
  const response = await fetch(base + path, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error(path + ' returned HTTP ' + response.status);
  }
  return response.json();
}

async function main() {
  const dates = ['2026-07-30', '2026-08-04', '2026-08-05'];
  for (const date of dates) {
    const data = await json('/api/events/public?date=' + date + '&page=1&limit=100');
    if (!data || !Array.isArray(data.events)) {
      throw new Error('Invalid public events payload for ' + date);
    }
    console.log('PUBLIC_DATE_' + date.replaceAll('-', '_') + '_COUNT=' + data.events.length);
  }

  const july = await json('/api/events/public/calendar?year=2026&month=7');
  const august = await json('/api/events/public/calendar?year=2026&month=8');
  if (!Array.isArray(july) || !Array.isArray(august)) {
    throw new Error('Invalid calendar marker payload');
  }
  console.log('CALENDAR_JULY_MARKERS=' + july.length);
  console.log('CALENDAR_AUGUST_MARKERS=' + august.length);

  const mainEvents = await json('/api/events/public/main');
  if (!Array.isArray(mainEvents)) {
    throw new Error('Invalid main-events payload');
  }
  const invalid = mainEvents.filter((event) =>
    event.mainEvent !== true ||
    event.status !== 'PUBLISHED' ||
    !event.images?.some((image) => Boolean(image.mainEventUrl))
  );
  if (invalid.length > 0) {
    throw new Error('Main-events endpoint returned invalid records');
  }
  if (mainEvents.length === 0) {
    throw new Error('Main-events endpoint returned no events');
  }
  console.log('MAIN_EVENTS_COUNT=' + mainEvents.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
}

force_recent_backfill() {
  local backend_container="$1"

  docker exec -i "$backend_container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.siteConfig.deleteMany({
  where: { key: 'maxImport.recentBackfillV3' },
})
  .then((result) => console.log(`RECENT_BACKFILL_MARKER_REMOVED=${result.count}`))
  .finally(() => prisma.$disconnect());
NODE
}

inspect_reported_events() {
  local backend_container="$1"

  docker exec -i "$backend_container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const expected = [
  { key: 'AUTOUSN', title: 'АВТОУСН', date: '2026-07-30' },
  { key: 'FNS_RISKS', title: 'ФНС УЖЕ ВИДИТ РИСКИ', date: '2026-08-04' },
  { key: 'HR_CHANGES', title: 'КАДРОВЫЕ ИЗМЕНЕНИЯ ИДУТ', date: '2026-08-05' },
];

async function publicEvents(date) {
  const response = await fetch(
    `http://localhost:3001/api/events/public?date=${date}&page=1&limit=100`,
  );
  if (!response.ok) {
    throw new Error(`Internal public API returned HTTP ${response.status} for ${date}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.events) ? payload.events : [];
}

async function main() {
  let complete = 0;
  let missing = 0;
  let needsAttention = 0;

  for (const item of expected) {
    const event = await prisma.event.findFirst({
      where: {
        source: 'MAX',
        title: { contains: item.title, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        images: true,
        directions: { include: { direction: true } },
      },
    });

    if (!event) {
      missing++;
      console.log(`${item.key}_DB_STATUS=MISSING`);
      continue;
    }

    const date = event.startDate.toISOString().slice(0, 10);
    const hasImage = event.images.some((image) => Boolean(
      image.eventCardUrl || image.originalUrl || image.thumbnailUrl || image.mainEventUrl
    ));
    const directions = event.directions.map((row) => row.direction.slug).join(',');
    const ready = event.status === 'PUBLISHED' && hasImage && date === item.date;
    let publicVisible = false;

    if (ready) {
      const events = await publicEvents(item.date);
      publicVisible = events.some((candidate) => candidate.id === event.id);
      if (!publicVisible) {
        throw new Error(`${item.key} is published in DB but absent from public API`);
      }
    }

    console.log(`${item.key}_DB_STATUS=${event.status}`);
    console.log(`${item.key}_DATE=${date}`);
    console.log(`${item.key}_FORMAT=${event.format}`);
    console.log(`${item.key}_CITY=${event.cityName ?? ''}`);
    console.log(`${item.key}_IMAGE=${hasImage}`);
    console.log(`${item.key}_PUBLIC=${publicVisible}`);
    console.log(`${item.key}_MAIN_EVENT=${event.mainEvent}`);
    console.log(`${item.key}_DIRECTIONS=${directions}`);
    console.log(`${item.key}_EXTERNAL_ID=${event.externalId ?? ''}`);

    if (ready) complete++;
    else needsAttention++;
  }

  console.log(`REPORTED_EVENTS_COMPLETE=${complete}`);
  console.log(`REPORTED_EVENTS_MISSING=${missing}`);
  console.log(`REPORTED_EVENTS_NEED_ATTENTION=${needsAttention}`);
  console.log(complete === expected.length ? 'EVENT_RECOVERY_OK' : 'EVENT_RECOVERY_INCOMPLETE');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
NODE
}

cleanup() {
  set +e
  [ -z "${BACKEND_PREFLIGHT:-}" ] || docker rm -f "$BACKEND_PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "${FRONTEND_PREFLIGHT:-}" ] || docker rm -f "$FRONTEND_PREFLIGHT" >/dev/null 2>&1 || true
  [ -z "${BACKEND_ENV_FILE:-}" ] || rm -f "$BACKEND_ENV_FILE"
  [ -z "${FRONTEND_ENV_FILE:-}" ] || rm -f "$FRONTEND_ENV_FILE"
  [ -z "${WORKTREE:-}" ] || git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  [ -z "${WORKTREE:-}" ] || rm -rf "$WORKTREE"
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
}

rollback() {
  set +e
  [ "${SWITCHED:-0}" -eq 1 ] || return 0

  section "АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND И FRONTEND"
  echo "ROLLBACK_TAG=$ROLLBACK_TAG"
  APP_VERSION="$ROLLBACK_TAG" dc up -d --no-deps --force-recreate backend frontend || true

  local backend frontend
  backend="$(dc ps -q backend 2>/dev/null || true)"
  frontend="$(dc ps -q frontend 2>/dev/null || true)"
  [ -z "$backend" ] || wait_backend "$backend" "$BACKEND_ROLLBACK_IMAGE" || true
  [ -z "$frontend" ] || wait_frontend "$frontend" "$FRONTEND_ROLLBACK_IMAGE" || true
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
WORKTREE=""
BACKEND_PREFLIGHT=""
FRONTEND_PREFLIGHT=""
BACKEND_ENV_FILE=""
FRONTEND_ENV_FILE=""

section "1. PREFLIGHT СЕРВЕРА"

test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"
test -d "$ROOT/.git"

available_kb="$(df -Pk / | awk 'NR == 2 {print $4}')"
echo "AVAILABLE_DISK_KB=$available_kb"
test "$available_kb" -ge "$MIN_FREE_KB"

old_backend="$(dc ps -q backend)"
old_frontend="$(dc ps -q frontend)"
bots_before="$(dc ps -q bots)"
nginx_before="$(dc ps -q nginx)"

test -n "$old_backend"
test -n "$old_frontend"
test -n "$bots_before"
test -n "$nginx_before"

old_backend_image="$(container_image "$old_backend")"
old_frontend_image="$(container_image "$old_frontend")"
bots_image_before="$(container_image "$bots_before")"
nginx_sha_before="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_before="$(git status --short)"

max_import_enabled="$(docker inspect "$old_backend" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MAX_IMPORT_ENABLED=//p' | tail -n 1)"
echo "MAX_IMPORT_ENABLED=$max_import_enabled"
test "$max_import_enabled" = "true"

echo "BACKEND_BEFORE=$old_backend_image"
echo "FRONTEND_BEFORE=$old_frontend_image"
echo "BOTS_BEFORE=$bots_image_before"

section "2. TARGET И ЧИСТЫЙ WORKTREE"

git fetch --prune origin main
TARGET="$(git rev-parse "$TARGET_INPUT")"
ORIGIN_MAIN="$(git rev-parse origin/main)"
SHORT="${TARGET:0:7}"
TAG="max-ingestion-${SHORT}"
BACKEND_IMAGE="ab-afisha/backend:${TAG}"
FRONTEND_IMAGE="ab-afisha/frontend:${TAG}"
WORKTREE="/srv/ab-afisha-release-${SHORT}"
BACKEND_PREFLIGHT="ab-afisha-backend-preflight-${SHORT}"
FRONTEND_PREFLIGHT="ab-afisha-frontend-preflight-${SHORT}"
ROLLBACK_TAG="rollback-before-${SHORT}-$(date +%Y%m%d-%H%M%S)"
BACKEND_ROLLBACK_IMAGE="ab-afisha/backend:${ROLLBACK_TAG}"
FRONTEND_ROLLBACK_IMAGE="ab-afisha/frontend:${ROLLBACK_TAG}"

echo "TARGET=$TARGET"
echo "ORIGIN_MAIN=$ORIGIN_MAIN"
echo "BACKEND_TARGET=$BACKEND_IMAGE"
echo "FRONTEND_TARGET=$FRONTEND_IMAGE"

test "$TARGET" = "$ORIGIN_MAIN"
git cat-file -e "${TARGET}^{commit}"

git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
rm -rf "$WORKTREE"
git worktree add --detach "$WORKTREE" "$TARGET"
test "$(git -C "$WORKTREE" rev-parse HEAD)" = "$TARGET"
test -z "$(git -C "$WORKTREE" status --porcelain)"
echo "WORKTREE_CLEAN=true"

section "3. SOURCE-КОНТРАКТЫ"

grep -F 'class MaxReliableImportService' "$WORKTREE/apps/backend/src/modules/max-import/max-reliable-import.service.ts"
grep -F 'batch.marker !== undefined' "$WORKTREE/apps/backend/src/modules/max-import/max-reliable-import.service.ts"
grep -F 'await this.saveStoredMarker(batch.marker)' "$WORKTREE/apps/backend/src/modules/max-import/max-reliable-import.service.ts"
grep -F 'runRecentBackfill' "$WORKTREE/apps/backend/src/modules/max-import/max-import-bootstrap.service.ts"
grep -F 'reprocessPending' "$WORKTREE/apps/backend/src/modules/max-import/max-import-bootstrap.service.ts"
grep -F 'CYRILLIC_DIRECTION_HINTS' "$WORKTREE/apps/backend/src/modules/max-import/max-parser.service.ts"
grep -F 'const cityAndDetails = rawValue.match' "$WORKTREE/apps/backend/src/modules/max-import/max-parser-v2.service.ts"
grep -F 'MainEventsCarouselBridge' "$WORKTREE/apps/frontend/src/app/page.tsx"
grep -F '<!-- #хит -->' "$WORKTREE/apps/frontend/src/components/events/MainEventsCarouselBridge.tsx"
echo "SOURCE_CONTRACTS_OK"

section "4. TYPECHECK И ВСЕ REGRESSION-ТЕСТЫ"

docker run --rm \
  -v "$WORKTREE:/work" \
  -w /work \
  node:20-alpine \
  sh -lc '
    set -eu
    apk add --no-cache openssl >/dev/null
    npm install --global pnpm@9.15.0 >/dev/null
    pnpm install --frozen-lockfile --ignore-scripts
    pnpm --filter @ab-afisha/shared build
    pnpm --filter backend exec prisma generate --schema=prisma/schema.prisma
    pnpm --filter backend typecheck
    pnpm --filter frontend typecheck
    node --test apps/backend/test/*.test.mjs
    node --test apps/frontend/test/*.test.mjs
  '
echo "CHECKS_OK"

section "5. BUILD BACKEND И FRONTEND"

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

declare -a frontend_build_args=()
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
  [ -z "$value" ] || frontend_build_args+=(--build-arg "${key}=${value}")
done

cd "$WORKTREE"
DOCKER_BUILDKIT=1 docker build \
  --progress=plain \
  --label "org.opencontainers.image.revision=${TARGET}" \
  --file apps/backend/Dockerfile \
  --tag "$BACKEND_IMAGE" \
  .

DOCKER_BUILDKIT=1 docker build \
  --progress=plain \
  --label "org.opencontainers.image.revision=${TARGET}" \
  "${frontend_build_args[@]}" \
  --file apps/frontend/Dockerfile \
  --tag "$FRONTEND_IMAGE" \
  .

backend_revision="$(docker image inspect "$BACKEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
frontend_revision="$(docker image inspect "$FRONTEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$backend_revision" = "$TARGET"
test "$frontend_revision" = "$TARGET"
echo "BUILD_OK"

section "6. PREFLIGHT ОБРАЗОВ"

cd "$ROOT"
BACKEND_ENV_FILE="$(mktemp)"
FRONTEND_ENV_FILE="$(mktemp)"
chmod 600 "$BACKEND_ENV_FILE" "$FRONTEND_ENV_FILE"
docker inspect "$old_backend" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -v '^HOSTNAME=' >"$BACKEND_ENV_FILE"
docker inspect "$old_frontend" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -v '^HOSTNAME=' >"$FRONTEND_ENV_FILE"

docker rm -f "$BACKEND_PREFLIGHT" "$FRONTEND_PREFLIGHT" >/dev/null 2>&1 || true

docker run -d \
  --name "$BACKEND_PREFLIGHT" \
  --network ab-afisha_default \
  --env-file "$BACKEND_ENV_FILE" \
  -e MAX_IMPORT_ENABLED=false \
  --entrypoint node \
  "$BACKEND_IMAGE" \
  dist/main \
  >/dev/null

wait_backend "$BACKEND_PREFLIGHT" "$BACKEND_IMAGE"
echo "BACKEND_PREFLIGHT_OK"

docker run -d \
  --name "$FRONTEND_PREFLIGHT" \
  --network ab-afisha_default \
  --env-file "$FRONTEND_ENV_FILE" \
  "$FRONTEND_IMAGE" \
  >/dev/null

wait_frontend "$FRONTEND_PREFLIGHT" "$FRONTEND_IMAGE"
verify_frontend_runtime "$FRONTEND_PREFLIGHT"
echo "FRONTEND_PREFLIGHT_OK"

docker rm -f "$BACKEND_PREFLIGHT" "$FRONTEND_PREFLIGHT" >/dev/null
BACKEND_PREFLIGHT=""
FRONTEND_PREFLIGHT=""

section "7. ТОЧКА ОТКАТА И ПРИНУДИТЕЛЬНЫЙ BACKFILL"

if docker image inspect "$old_backend_image" >/dev/null 2>&1; then
  docker tag "$old_backend_image" "$BACKEND_ROLLBACK_IMAGE"
else
  docker commit "$old_backend" "$BACKEND_ROLLBACK_IMAGE" >/dev/null
fi

if docker image inspect "$old_frontend_image" >/dev/null 2>&1; then
  docker tag "$old_frontend_image" "$FRONTEND_ROLLBACK_IMAGE"
else
  docker commit "$old_frontend" "$FRONTEND_ROLLBACK_IMAGE" >/dev/null
fi

docker image inspect "$BACKEND_ROLLBACK_IMAGE" >/dev/null
docker image inspect "$FRONTEND_ROLLBACK_IMAGE" >/dev/null
force_recent_backfill "$old_backend"
echo "ROLLBACK_TAG=$ROLLBACK_TAG"

section "8. ПЕРЕКЛЮЧАЕМ BACKEND"

SWITCHED=1
APP_VERSION="$TAG" dc up -d --no-deps --force-recreate backend
new_backend="$(dc ps -q backend)"
test -n "$new_backend"
wait_backend "$new_backend" "$BACKEND_IMAGE"
wait_startup_reconciliation "$new_backend"
echo "PRODUCTION_BACKEND_OK"

section "9. ПЕРЕКЛЮЧАЕМ FRONTEND"

APP_VERSION="$TAG" dc up -d --no-deps --force-recreate frontend
new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$FRONTEND_IMAGE"
verify_frontend_runtime "$new_frontend"
echo "PRODUCTION_FRONTEND_OK"

section "10. ПУБЛИЧНЫЙ HTTP И API"

public_http=""
for attempt in $(seq 1 30); do
  public_http="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$PUBLIC_URL/?deploy=${SHORT}&attempt=${attempt}" || true)"
  echo "Public $attempt: HTTP $public_http"
  [ "$public_http" = "200" ] && break
  sleep 2
done
test "$public_http" = "200"

verify_public_api "$new_backend" "$PUBLIC_URL"
echo "PUBLIC_API_OK"

section "11. ПРОВЕРКА ТРЁХ СОБЫТИЙ В БАЗЕ И API"

inspect_reported_events "$new_backend"

section "12. BOTS И NGINX НЕ ИЗМЕНЕНЫ"

bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"
test "$bots_after" = "$bots_before"
test "$nginx_after" = "$nginx_before"

bots_image_after="$(container_image "$bots_after")"
nginx_sha_after="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_after="$(git status --short)"

test "$bots_image_after" = "$bots_image_before"
test "$nginx_sha_after" = "$nginx_sha_before"
test "$git_status_after" = "$git_status_before"

new_backend_image="$(container_image "$new_backend")"
new_frontend_image="$(container_image "$new_frontend")"
new_backend_revision="$(docker image inspect "$new_backend_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
new_frontend_revision="$(docker image inspect "$new_frontend_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"

test "$new_backend_image" = "$BACKEND_IMAGE"
test "$new_frontend_image" = "$FRONTEND_IMAGE"
test "$new_backend_revision" = "$TARGET"
test "$new_frontend_revision" = "$TARGET"

SWITCHED=0

printf '\n==========================================\n'
echo "DEPLOY_OK"
echo "COMMIT=$TARGET"
echo "PRODUCTION_BACKEND=$new_backend_image"
echo "PRODUCTION_FRONTEND=$new_frontend_image"
echo "PRODUCTION_REVISION=$TARGET"
echo "PUBLIC_HTTP=$public_http"
echo "MAX_RELIABLE_POLL=true"
echo "MAX_RECENT_BACKFILL=true"
echo "MAX_PENDING_REPROCESS=true"
echo "CALENDAR_API_VERIFIED=true"
echo "MAIN_EVENTS_API_VERIFIED=true"
echo "BOTS_UNCHANGED=$bots_image_after"
echo "NGINX_PRESERVED=true"
echo "ROLLBACK_TAG=$ROLLBACK_TAG"
printf '==========================================\n'

dc ps backend frontend bots nginx
