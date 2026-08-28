#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/ab-afisha}"
LOCK_FILE="${LOCK_FILE:-$ROOT/infra/deploy/production-frontend.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.production.v2.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://ab-event.pro}"
EXPECTED_LEGACY_UNRESOLVED="${EXPECTED_LEGACY_UNRESOLVED:-3}"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ -d "$ROOT/.git" ] || fail "repository not found: $ROOT"
[ -f "$LOCK_FILE" ] || fail "production lock not found: $LOCK_FILE"
[ -f "$COMPOSE_FILE" ] || fail "compose file not found: $COMPOSE_FILE"

cd "$ROOT"
# shellcheck disable=SC1090
source "$LOCK_FILE"

: "${PRODUCTION_BACKEND_IMAGE:?missing PRODUCTION_BACKEND_IMAGE}"

BACKEND_CONTAINER="$(
  BACKEND_IMAGE="$PRODUCTION_BACKEND_IMAGE" \
  FRONTEND_IMAGE="${PRODUCTION_FRONTEND_IMAGE:-}" \
  BOTS_IMAGE="${PRODUCTION_BOTS_IMAGE:-}" \
    docker compose -p ab-afisha -f "$COMPOSE_FILE" ps -q backend
)"

[ -n "$BACKEND_CONTAINER" ] || fail "backend container not found"

ACTUAL_IMAGE="$(docker inspect "$BACKEND_CONTAINER" --format '{{.Config.Image}}')"
ACTUAL_STATUS="$(docker inspect "$BACKEND_CONTAINER" --format '{{.State.Status}}')"
ACTUAL_HEALTH="$(docker inspect "$BACKEND_CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"

printf '=== PRODUCTION CITY LIFECYCLE READ-ONLY QA ===\n'
printf 'BACKEND_CONTAINER=%s\n' "$BACKEND_CONTAINER"
printf 'BACKEND_IMAGE=%s\n' "$ACTUAL_IMAGE"
printf 'BACKEND_STATUS=%s\n' "$ACTUAL_STATUS"
printf 'BACKEND_HEALTH=%s\n' "$ACTUAL_HEALTH"
printf 'EXPECTED_LEGACY_UNRESOLVED=%s\n' "$EXPECTED_LEGACY_UNRESOLVED"

[ "$ACTUAL_IMAGE" = "$PRODUCTION_BACKEND_IMAGE" ] || fail "backend image differs from production lock"
[ "$ACTUAL_STATUS" = "running" ] || fail "backend is not running"
[ "$ACTUAL_HEALTH" = "healthy" ] || fail "backend is not healthy"

ROOT_HEAD_BEFORE="$(git rev-parse HEAD)"
NGINX_SHA_BEFORE="$(sha256sum infra/nginx/conf.d/production.v2.conf | awk '{print $1}')"
GIT_STATUS_BEFORE="$(git status --short --untracked-files=all)"

set +e
docker exec \
  -e EXPECTED_LEGACY_UNRESOLVED="$EXPECTED_LEGACY_UNRESOLVED" \
  -i "$BACKEND_CONTAINER" node <<'NODE'
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { isPlausibleCityName } = require('@ab-afisha/shared');
const { MaxParserService } = require('./dist/modules/max-import/max-parser.service.js');
const { EventPublicationLocationService } = require('./dist/modules/events/event-publication-location.service.js');
const { CitiesService } = require('./dist/modules/cities/cities.service.js');

const prisma = new PrismaClient();
const expectedLegacy = Number(process.env.EXPECTED_LEGACY_UNRESOLVED ?? '3');

function normalizedRows(rows) {
  return rows
    .map((row) => ({
      id: row.id,
      status: row.status,
      format: row.format,
      cityId: row.cityId,
      cityName: row.cityName,
      venue: row.venue,
      address: row.address,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function parserLine(name, result) {
  console.log([
    `PARSER_CASE=${name}`,
    `FORMAT=${result.format}`,
    `CITY=${JSON.stringify(result.city)}`,
    `VENUE=${JSON.stringify(result.venue)}`,
    `ADDRESS=${JSON.stringify(result.address)}`,
    `NEEDS_ATTENTION=${result.needsAttention}`,
    `REASONS=${JSON.stringify(result.attentionReasons)}`,
  ].join(' '));
}

async function expectBadRequest(label, fn) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught, `${label}: expected rejection`);
  const status = typeof caught.getStatus === 'function' ? caught.getStatus() : null;
  console.log(`${label}=true HTTP=${status} MESSAGE=${JSON.stringify(caught.message)}`);
  assert.equal(status, 400);
}

(async () => {
  const eventCountBefore = await prisma.event.count();
  const cityCountBefore = await prisma.city.count();

  const legacy = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      format: { in: ['OFFLINE', 'HYBRID'] },
      cityId: null,
    },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      status: true,
      format: true,
      cityId: true,
      cityName: true,
      venue: true,
      address: true,
    },
  });

  console.log(`LEGACY_UNRESOLVED_PUBLISHED_LOCATIONS=${legacy.length}`);
  assert.equal(legacy.length, expectedLegacy);

  const canonicalCandidates = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      format: { in: ['OFFLINE', 'HYBRID'] },
      cityId: { not: null },
    },
    take: 100,
    select: {
      id: true,
      status: true,
      format: true,
      cityId: true,
      cityName: true,
      venue: true,
      address: true,
      city: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  const canonical = canonicalCandidates.find((event) =>
    event.cityId &&
    event.city?.isActive === true &&
    isPlausibleCityName(event.city.name) &&
    event.cityName?.trim() === event.city.name
  );

  assert.ok(canonical, 'No canonical published physical event found for publication-guard QA');

  const watchedIds = [canonical.id, ...legacy.map((event) => event.id)];
  const before = normalizedRows(
    await prisma.event.findMany({
      where: { id: { in: watchedIds } },
      select: {
        id: true,
        status: true,
        format: true,
        cityId: true,
        cityName: true,
        venue: true,
        address: true,
      },
    }),
  );

  console.log(`EVENT_COUNT_BEFORE=${eventCountBefore}`);
  console.log(`CITY_COUNT_BEFORE=${cityCountBefore}`);
  console.log(`CANONICAL_QA_EVENT=${canonical.id}`);
  console.log(`WATCHED_BEFORE=${JSON.stringify(before)}`);

  const parser = new MaxParserService();
  const referenceDate = new Date('2026-08-28T06:00:00Z');

  const moscow = parser.parse(
`QA Москва
Дата: 30 сентября 2026
Формат: Очно
Где: Москва
#налоги`,
    referenceDate,
  );
  parserLine('OFFLINE_MOSCOW', moscow);
  assert.equal(moscow.format, 'OFFLINE');
  assert.equal(moscow.city, 'Москва');
  assert.equal(moscow.venue, null);
  assert.equal(moscow.needsAttention, false);
  console.log('QA_OFFLINE_MOSCOW_OK=true');

  const expo = parser.parse(
`QA Санкт-Петербург
Дата: 30 сентября 2026
Формат: Очно
Где: Экспофорум, Санкт-Петербург
#налоги`,
    referenceDate,
  );
  parserLine('VENUE_FIRST_SPB', expo);
  assert.equal(expo.format, 'OFFLINE');
  assert.equal(expo.city, 'Санкт-Петербург');
  assert.equal(expo.venue, 'Экспофорум');
  assert.equal(expo.needsAttention, false);
  console.log('QA_VENUE_FIRST_SPB_OK=true');

  const invalidCases = [
    ['ST1', 'ст1'],
    ['OCHNO', 'Очно'],
    ['VENUE_ONLY', 'Экспофорум'],
  ];

  for (const [label, where] of invalidCases) {
    const result = parser.parse(
`QA ${label}
Дата: 30 сентября 2026
Формат: Очно
Где: ${where}
#налоги`,
      referenceDate,
    );
    parserLine(`INVALID_${label}`, result);
    assert.equal(result.format, 'OFFLINE');
    assert.equal(result.city, null);
    assert.equal(result.needsAttention, true);
    assert.ok(result.attentionReasons.some((reason) =>
      reason.includes('Город очного участия не определён или требует проверки')
    ));
    console.log(`QA_INVALID_${label}_BLOCKED=true`);
  }

  const hybrid = parser.parse(
`QA Hybrid
Дата: 30 сентября 2026
Формат: офлайн + онлайн
#налоги`,
    referenceDate,
  );
  parserLine('HYBRID_WITHOUT_LOCATION', hybrid);
  assert.equal(hybrid.format, 'HYBRID');
  assert.equal(hybrid.city, null);
  assert.equal(hybrid.needsAttention, true);
  console.log('QA_HYBRID_WITHOUT_LOCATION_BLOCKED=true');

  for (const value of ['Москва', 'Санкт-Петербург', 'Зеленоградск']) {
    assert.equal(isPlausibleCityName(value), true);
    console.log(`CLASSIFIER_GOOD=${JSON.stringify(value)} RESULT=true`);
  }

  for (const value of ['Очно', 'ст1', 'Экспофорум', '4-й Лесной пер.', 'офлайн + онлайн']) {
    assert.equal(isPlausibleCityName(value), false);
    console.log(`CLASSIFIER_BAD=${JSON.stringify(value)} RESULT=false`);
  }
  console.log('QA_CITY_CLASSIFIER_OK=true');

  const forbiddenPrisma = new Proxy({}, {
    get() {
      throw new Error('CITY_QA_FORBIDDEN_DATABASE_ACCESS');
    },
  });
  const citiesService = new CitiesService(forbiddenPrisma);
  const invalidCityNames = ['Очно', 'ст1', 'Экспофорум', '4-й Лесной пер.', 'офлайн + онлайн'];

  for (const badName of invalidCityNames) {
    await expectBadRequest(`CITY_CREATE_REJECTED_${JSON.stringify(badName)}`, () =>
      citiesService.create({ name: badName, region: 'QA' })
    );
  }
  console.log('QA_CITY_CREATE_GUARD_OK=true');

  const renameGuardPrisma = {
    city: {
      findUnique: async () => ({
        id: 'qa-existing-city',
        name: 'Москва',
        region: 'Москва',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        _count: { events: 0 },
      }),
      findFirst: async () => {
        throw new Error('CITY_RENAME_QA_FORBIDDEN_DUPLICATE_LOOKUP');
      },
      update: async () => {
        throw new Error('CITY_RENAME_QA_FORBIDDEN_UPDATE');
      },
    },
  };
  const renameCitiesService = new CitiesService(renameGuardPrisma);

  for (const badName of invalidCityNames) {
    await expectBadRequest(`CITY_RENAME_REJECTED_${JSON.stringify(badName)}`, () =>
      renameCitiesService.update('qa-existing-city', { name: badName })
    );
  }
  console.log('QA_CITY_RENAME_GUARD_OK=true');
  console.log('QA_CITY_CRUD_GUARD_OK=true');

  let forbiddenUpdateCalls = 0;
  const readOnlyPrisma = {
    event: {
      findUnique: (args) => prisma.event.findUnique(args),
      update: async () => {
        forbiddenUpdateCalls += 1;
        throw new Error('QA_FORBIDDEN_EVENT_UPDATE');
      },
    },
  };

  const publicationGuard = new EventPublicationLocationService(readOnlyPrisma);
  await publicationGuard.ensureCanonicalPhysicalCity(canonical.id);
  assert.equal(forbiddenUpdateCalls, 0);
  console.log('QA_CANONICAL_PUBLICATION_GUARD_OK=true');

  for (const event of legacy) {
    assert.equal(event.cityId, null);
    await expectBadRequest(`LEGACY_GUARD_REJECTED_${event.id}`, () =>
      publicationGuard.ensureCanonicalPhysicalCity(event.id)
    );
  }
  assert.equal(forbiddenUpdateCalls, 0);
  console.log('QA_LEGACY_PUBLICATION_GUARD_OK=true');

  const eventCountAfter = await prisma.event.count();
  const cityCountAfter = await prisma.city.count();
  const after = normalizedRows(
    await prisma.event.findMany({
      where: { id: { in: watchedIds } },
      select: {
        id: true,
        status: true,
        format: true,
        cityId: true,
        cityName: true,
        venue: true,
        address: true,
      },
    }),
  );

  assert.equal(eventCountAfter, eventCountBefore);
  assert.equal(cityCountAfter, cityCountBefore);
  assert.deepEqual(after, before);
  assert.equal(forbiddenUpdateCalls, 0);

  console.log(`EVENT_COUNT_AFTER=${eventCountAfter}`);
  console.log(`CITY_COUNT_AFTER=${cityCountAfter}`);
  console.log(`WATCHED_AFTER=${JSON.stringify(after)}`);
  console.log('QA_DATABASE_UNCHANGED=true');
  console.log('READ_ONLY_PRODUCTION_QA_OK=true');
})()
  .catch((error) => {
    console.error('READ_ONLY_PRODUCTION_QA_FAILED=true');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE
QA_RC=$?
set -e

HOMEPAGE_HTTP="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/?city-lifecycle-qa=1" || true)"
HEALTH_HTTP="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/api/health" || true)"

ROOT_HEAD_AFTER="$(git rev-parse HEAD)"
NGINX_SHA_AFTER="$(sha256sum infra/nginx/conf.d/production.v2.conf | awk '{print $1}')"
GIT_STATUS_AFTER="$(git status --short --untracked-files=all)"

printf '\n=== PUBLIC AFTER QA ===\n'
printf 'HOMEPAGE_HTTP=%s\n' "$HOMEPAGE_HTTP"
printf 'HEALTH_HTTP=%s\n' "$HEALTH_HTTP"
printf '\n=== PRODUCTION SAFETY AFTER QA ===\n'
printf 'ROOT_HEAD_BEFORE=%s\n' "$ROOT_HEAD_BEFORE"
printf 'ROOT_HEAD_AFTER=%s\n' "$ROOT_HEAD_AFTER"
printf 'NGINX_SHA_BEFORE=%s\n' "$NGINX_SHA_BEFORE"
printf 'NGINX_SHA_AFTER=%s\n' "$NGINX_SHA_AFTER"
printf 'QA_EXIT_CODE=%s\n' "$QA_RC"

[ "$HOMEPAGE_HTTP" = "200" ] || fail "homepage check failed after QA"
[ "$HEALTH_HTTP" = "200" ] || fail "health check failed after QA"
[ "$ROOT_HEAD_AFTER" = "$ROOT_HEAD_BEFORE" ] || fail "root HEAD changed during QA"
[ "$NGINX_SHA_AFTER" = "$NGINX_SHA_BEFORE" ] || fail "nginx config changed during QA"
[ "$GIT_STATUS_AFTER" = "$GIT_STATUS_BEFORE" ] || fail "local git status changed during QA"
[ "$QA_RC" -eq 0 ] || fail "Node city lifecycle QA failed"

printf 'PRODUCTION_CITY_LIFECYCLE_QA_OK=true\n'
