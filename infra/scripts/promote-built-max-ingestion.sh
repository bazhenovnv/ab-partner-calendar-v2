#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://ab-event.pro}"
TARGET="${1:?Usage: promote-built-max-ingestion.sh <40-char-image-revision>}"

if [[ ! "$TARGET" =~ ^[0-9a-f]{40}$ ]]; then
  echo "TARGET must be a full 40-character commit SHA" >&2
  exit 2
fi

SHORT="${TARGET:0:7}"
TAG="max-ingestion-${SHORT}"
BACKEND_IMAGE="ab-afisha/backend:${TAG}"
FRONTEND_IMAGE="ab-afisha/frontend:${TAG}"
ROLLBACK_TAG="rollback-before-promote-${SHORT}-$(date +%Y%m%d-%H%M%S)"
BACKEND_ROLLBACK_IMAGE="ab-afisha/backend:${ROLLBACK_TAG}"
FRONTEND_ROLLBACK_IMAGE="ab-afisha/frontend:${ROLLBACK_TAG}"
SWITCHED=0

cd "$ROOT"

dc() {
  docker compose -p ab-afisha -f "$COMPOSE_FILE" "$@"
}

section() {
  printf '\n=== %s ===\n' "$1"
}

wait_backend() {
  local container="$1"
  local expected_image="$2"

  for attempt in $(seq 1 90); do
    local state image
    state="$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || true)"
    image="$(docker inspect "$container" --format '{{.Config.Image}}' 2>/dev/null || true)"
    echo "Backend $attempt: state=${state:-unknown} image=${image:-unknown}"

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

  for attempt in $(seq 1 90); do
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

    echo "MAX reconciliation $attempt: waiting"
    sleep 2
  done

  docker logs --tail 300 "$container" || true
  return 1
}

reset_recent_backfill() {
  local container="$1"

  docker exec -i "$container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.siteConfig.deleteMany({
  where: { key: 'maxImport.recentBackfillV3' },
})
  .then((result) => {
    console.log(`RECENT_BACKFILL_MARKER_REMOVED=${result.count}`);
  })
  .finally(() => prisma.$disconnect());
NODE
}

verify_events_and_apis() {
  local container="$1"

  docker exec -e VERIFY_PUBLIC_URL="$PUBLIC_URL" -i "$container" node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const publicBase = process.env.VERIFY_PUBLIC_URL;
const internalBase = 'http://localhost:3001';

const expected = [
  { key: 'AUTOUSN', date: '2026-07-30', titlePart: 'АВТОУСН' },
  { key: 'FNS_RISKS', date: '2026-08-04', titlePart: 'ФНС УЖЕ ВИДИТ РИСКИ' },
  { key: 'HR_CHANGES', date: '2026-08-05', titlePart: 'КАДРОВЫЕ ИЗМЕНЕНИЯ ИДУТ' },
];

async function json(base, path) {
  const response = await fetch(base + path, {
    headers: { 'cache-control': 'no-cache' },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${base}${path} returned HTTP ${response.status}: ${body}`);
  }
  return JSON.parse(body);
}

async function eventsFor(base, date) {
  const payload = await json(
    base,
    `/api/events/public?date=${date}&page=1&limit=50`,
  );
  if (!Array.isArray(payload.events)) {
    throw new Error(`Invalid events payload for ${date}`);
  }
  return payload.events;
}

async function main() {
  for (const item of expected) {
    const start = new Date(`${item.date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const candidates = await prisma.event.findMany({
      where: {
        source: 'MAX',
        startDate: { gte: start, lt: end },
      },
      include: {
        images: true,
        directions: { include: { direction: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const event = candidates.find((candidate) =>
      candidate.title.toLocaleUpperCase('ru-RU').includes(item.titlePart),
    );
    if (!event) {
      throw new Error(`${item.key}: matching MAX event is absent from DB`);
    }

    const hasImage = event.images.some((image) => Boolean(
      image.eventCardUrl ||
      image.originalUrl ||
      image.thumbnailUrl ||
      image.mainEventUrl
    ));
    if (event.status !== 'PUBLISHED') {
      throw new Error(`${item.key}: DB status is ${event.status}, expected PUBLISHED`);
    }
    if (!hasImage) {
      throw new Error(`${item.key}: event image is absent`);
    }

    const internalEvents = await eventsFor(internalBase, item.date);
    const publicEvents = await eventsFor(publicBase, item.date);
    const internalVisible = internalEvents.some((candidate) => candidate.id === event.id);
    const publicVisible = publicEvents.some((candidate) => candidate.id === event.id);

    if (!internalVisible || !publicVisible) {
      throw new Error(
        `${item.key}: visibility internal=${internalVisible} public=${publicVisible}`,
      );
    }

    const directions = event.directions
      .map((row) => row.direction.slug)
      .join(',');
    console.log(`${item.key}_DB_STATUS=${event.status}`);
    console.log(`${item.key}_DATE=${item.date}`);
    console.log(`${item.key}_FORMAT=${event.format}`);
    console.log(`${item.key}_CITY=${event.cityName ?? ''}`);
    console.log(`${item.key}_IMAGE=${hasImage}`);
    console.log(`${item.key}_INTERNAL_API=${internalVisible}`);
    console.log(`${item.key}_PUBLIC_API=${publicVisible}`);
    console.log(`${item.key}_MAIN_EVENT=${event.mainEvent}`);
    console.log(`${item.key}_DIRECTIONS=${directions}`);
  }

  for (const [year, month, requiredDates] of [
    [2026, 7, ['2026-07-30']],
    [2026, 8, ['2026-08-04', '2026-08-05']],
  ]) {
    const markers = await json(
      publicBase,
      `/api/events/public/calendar?year=${year}&month=${month}`,
    );
    if (!Array.isArray(markers)) {
      throw new Error(`Invalid calendar payload for ${year}-${month}`);
    }
    for (const date of requiredDates) {
      if (!markers.some((marker) => marker.date === date)) {
        throw new Error(`Calendar marker ${date} is absent`);
      }
    }
    console.log(`CALENDAR_${year}_${month}_MARKERS=${markers.length}`);
  }

  const mainEvents = await json(publicBase, '/api/events/public/main');
  if (!Array.isArray(mainEvents) || mainEvents.length === 0) {
    throw new Error('Main-events API returned no events');
  }
  const invalidMain = mainEvents.filter((event) =>
    event.mainEvent !== true ||
    event.status !== 'PUBLISHED' ||
    !event.images?.some((image) => Boolean(image.mainEventUrl))
  );
  if (invalidMain.length > 0) {
    throw new Error('Main-events API returned invalid records');
  }

  console.log(`MAIN_EVENTS_COUNT=${mainEvents.length}`);
  console.log('EVENT_RECOVERY_OK');
  console.log('PUBLIC_API_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
NODE
}

rollback() {
  set +e
  [ "$SWITCHED" -eq 1 ] || return 0

  section "АВТОМАТИЧЕСКИЙ ОТКАТ"
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
  echo "PROMOTION_FAILED"
  echo "EXIT_CODE=$rc"
  printf '==========================================\n'
  rollback
  exit "$rc"
}

trap on_error ERR

section "1. ПРОВЕРКА СОБРАННЫХ ОБРАЗОВ"

test -f "$COMPOSE_FILE"
docker image inspect "$BACKEND_IMAGE" >/dev/null
docker image inspect "$FRONTEND_IMAGE" >/dev/null

backend_revision="$(docker image inspect "$BACKEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
frontend_revision="$(docker image inspect "$FRONTEND_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
test "$backend_revision" = "$TARGET"
test "$frontend_revision" = "$TARGET"
echo "BUILT_IMAGES_OK"

old_backend="$(dc ps -q backend)"
old_frontend="$(dc ps -q frontend)"
bots_before="$(dc ps -q bots)"
nginx_before="$(dc ps -q nginx)"
test -n "$old_backend"
test -n "$old_frontend"
test -n "$bots_before"
test -n "$nginx_before"

old_backend_image="$(docker inspect "$old_backend" --format '{{.Config.Image}}')"
old_frontend_image="$(docker inspect "$old_frontend" --format '{{.Config.Image}}')"
bots_image_before="$(docker inspect "$bots_before" --format '{{.Config.Image}}')"
nginx_sha_before="$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')"
git_status_before="$(git status --short)"

echo "BACKEND_BEFORE=$old_backend_image"
echo "FRONTEND_BEFORE=$old_frontend_image"

section "2. СОЗДАНИЕ ТОЧКИ ОТКАТА"

docker tag "$old_backend_image" "$BACKEND_ROLLBACK_IMAGE"
docker tag "$old_frontend_image" "$FRONTEND_ROLLBACK_IMAGE"
docker image inspect "$BACKEND_ROLLBACK_IMAGE" >/dev/null
docker image inspect "$FRONTEND_ROLLBACK_IMAGE" >/dev/null
reset_recent_backfill "$old_backend"
echo "ROLLBACK_TAG=$ROLLBACK_TAG"

section "3. ПЕРЕКЛЮЧЕНИЕ BACKEND"

SWITCHED=1
APP_VERSION="$TAG" dc up -d --no-deps --force-recreate backend
new_backend="$(dc ps -q backend)"
test -n "$new_backend"
wait_backend "$new_backend" "$BACKEND_IMAGE"
wait_reconciliation "$new_backend"
echo "PRODUCTION_BACKEND_OK"

section "4. ПЕРЕКЛЮЧЕНИЕ FRONTEND"

APP_VERSION="$TAG" dc up -d --no-deps --force-recreate frontend
new_frontend="$(dc ps -q frontend)"
test -n "$new_frontend"
wait_frontend "$new_frontend" "$FRONTEND_IMAGE"
echo "PRODUCTION_FRONTEND_OK"

section "5. ПРОВЕРКА БАЗЫ, КАЛЕНДАРЯ И КАРУСЕЛИ"

verify_events_and_apis "$new_backend"

section "6. ПРОВЕРКА BOTS И NGINX"

bots_after="$(dc ps -q bots)"
nginx_after="$(dc ps -q nginx)"
test "$bots_after" = "$bots_before"
test "$nginx_after" = "$nginx_before"
test "$(docker inspect "$bots_after" --format '{{.Config.Image}}')" = "$bots_image_before"
test "$(sha256sum "$ROOT/infra/nginx/conf.d/production.v2.conf" | awk '{print $1}')" = "$nginx_sha_before"
test "$(git status --short)" = "$git_status_before"

SWITCHED=0

printf '\n==========================================\n'
echo "DEPLOY_OK"
echo "COMMIT=$TARGET"
echo "PRODUCTION_BACKEND=$BACKEND_IMAGE"
echo "PRODUCTION_FRONTEND=$FRONTEND_IMAGE"
echo "EVENT_RECOVERY_OK=true"
echo "CALENDAR_API_VERIFIED=true"
echo "MAIN_EVENTS_API_VERIFIED=true"
echo "BOTS_UNCHANGED=true"
echo "NGINX_PRESERVED=true"
echo "ROLLBACK_TAG=$ROLLBACK_TAG"
printf '==========================================\n'

dc ps backend frontend bots nginx
