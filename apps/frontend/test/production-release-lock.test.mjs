import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const LOCK = read('infra/deploy/production-frontend.env');
const RELEASE = read('PRODUCTION_RELEASE.md');
const COMPOSE = read('docker-compose.production.v2.yml');
const AGENTS = read('AGENTS.md');
const CLAUDE = read('CLAUDE.md');
const CI = read('.github/workflows/ci.yml');
const MAX_RUNTIME_TEST = read('apps/backend/test/max-parser-runtime.test.mjs');
const BACKEND_ENTRYPOINT = read('apps/backend/docker-entrypoint.sh');
const PRISMA_SCHEMA = read('apps/backend/prisma/schema.prisma');
const EDITORIAL_MIGRATION = read(
  'apps/backend/prisma/migrations/20260831100000_add_editorial_publisher/migration.sql',
);
const EDITORIAL_SCHEDULER = read('apps/backend/src/modules/editorial/editorial-scheduler.service.ts');
const EDITORIAL_IMAGE_SERVICE = read('apps/backend/src/modules/editorial/editorial-image.service.ts');
const EDITORIAL_SERVICE = read('apps/backend/src/modules/editorial/editorial.service.ts');
const EDITORIAL_DISCOVERY = read('apps/backend/src/modules/editorial/editorial-max-discovery.service.ts');
const EDITORIAL_PUBLISHER = read('apps/frontend/src/app/admin/editorial/EditorialPublisher.tsx');
const MAIN_EVENTS_SERVICE = read('apps/backend/src/modules/events/main-events.service.ts');
const MAIN_EVENTS_CONTROLLER = read('apps/backend/src/modules/events/events.controller.ts');
const MAIN_EVENTS_ROLLING_TEST = read('apps/frontend/test/main-events-rolling-window.test.mjs');
const EVENT_EDIT_PAGE = read('apps/frontend/src/app/admin/events/[id]/page.tsx');
const SOURCE_LINK_TEST = read('apps/frontend/test/needs-attention-max-source-link.test.mjs');
const MAX_SOURCE_POST_LINK_SERVICE = read(
  'apps/backend/src/modules/max-import/max-source-post-link.service.ts',
);
const MAX_SOURCE_PREVIEW_SERVICE = read(
  'apps/backend/src/modules/events/max-source-preview.service.ts',
);
const MAX_SOURCE_PREVIEW_CARD = read(
  'apps/frontend/src/components/admin/MaxSourcePreviewCard.tsx',
);
const MOBILE_FOOTER_TUNING = read('apps/frontend/src/app/mobile-figma-final-tuning.css');
const MOBILE_FOOTER_ARTWORK = read('apps/frontend/src/app/mobile-footer-artwork-final.css');
const MOBILE_FOOTER_TEST = read('apps/frontend/test/mobile-footer-artwork-clipping.test.mjs');

const BACKEND_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-backend.sh');
const BACKEND_FRONTEND_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-backend-frontend.sh');
const BACKEND_BOTS_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-backend-bots.sh');
const APP_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-app.sh');
const FRONTEND_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-frontend.sh');
const CLEANUP_PATH = resolve(ROOT, 'infra/scripts/cleanup-old-frontend-releases.sh');
const IPV6_HOST_PATH = resolve(ROOT, 'infra/scripts/configure-telegram-ipv6-host.sh');

const BACKEND_DEPLOY = read('infra/scripts/deploy-pinned-backend.sh');
const BACKEND_FRONTEND_DEPLOY = read('infra/scripts/deploy-pinned-backend-frontend.sh');
const BACKEND_BOTS_DEPLOY = read('infra/scripts/deploy-pinned-backend-bots.sh');
const FRONTEND_DEPLOY = read('infra/scripts/deploy-pinned-frontend.sh');
const CLEANUP = read('infra/scripts/cleanup-old-frontend-releases.sh');

const RELEASE_ANCHOR = '213e5076fc274254abf9a56612bd086df2155ce5';
const BACKEND_COMMIT = RELEASE_ANCHOR;
const BACKEND_TAG = 'backend-release-213e507';
const BACKEND_IMAGE = `ab-afisha/backend:${BACKEND_TAG}`;
const BOTS_COMMIT = '3a64511c98f7bf8cd59776dd5dce233939cd2988';
const BOTS_TAG = 'bots-release-3a64511';
const BOTS_IMAGE = `ab-afisha/bots:${BOTS_TAG}`;
const FRONTEND_COMMIT = 'afc024cfc9f46ebcba1bb383f77f63779062e648';
const FRONTEND_TAG = 'frontend-release-afc024c';
const FRONTEND_IMAGE = `ab-afisha/frontend:${FRONTEND_TAG}`;
const MAX3_URL = 'https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA';

describe('Pinned production component release', () => {
  test('defines independent machine-readable pins for mobile footer frontend promotion', () => {
    assert.match(LOCK, new RegExp(`PRODUCTION_RELEASE_COMMIT=${RELEASE_ANCHOR}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BACKEND_COMMIT=${BACKEND_COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BACKEND_TAG=${BACKEND_TAG}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BACKEND_IMAGE=${BACKEND_IMAGE}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BOTS_COMMIT=${BOTS_COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BOTS_TAG=${BOTS_TAG}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BOTS_IMAGE=${BOTS_IMAGE}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_COMMIT=${FRONTEND_COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_TAG=${FRONTEND_TAG}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_IMAGE=${FRONTEND_IMAGE}`));
    assert.match(LOCK, /PRODUCTION_RELEASE_APPROVED_AT=2026-09-02/);
  });

  test('documents exact component pins and frontend-only deployment', () => {
    for (const content of [RELEASE, AGENTS, CLAUDE]) {
      assert.match(content, new RegExp(RELEASE_ANCHOR));
      assert.match(content, new RegExp(BACKEND_IMAGE));
      assert.match(content, new RegExp(BOTS_COMMIT));
      assert.match(content, new RegExp(BOTS_IMAGE));
      assert.match(content, new RegExp(FRONTEND_COMMIT));
      assert.match(content, new RegExp(FRONTEND_IMAGE));
      assert.match(content, /deploy-pinned-frontend\.sh/);
    }

    assert.match(RELEASE, /единственный источник истины \(SSOT\)/i);
    assert.match(RELEASE, /PR #136/);
    assert.match(RELEASE, /CI #870/);
    assert.match(RELEASE, /124×158 px/);
    assert.match(RELEASE, /129×174 px/);
    assert.match(RELEASE, /notebook source width: `180 px`/i);
    assert.match(RELEASE, /mobile-footer-artwork-clipping\.test\.mjs/);
    assert.match(RELEASE, /PR #133/);
    assert.match(RELEASE, /CI #865/);
    assert.match(RELEASE, /is_public=false/);
    assert.match(RELEASE, /message\.url/);
    assert.match(RELEASE, /Исходный пост MAX/);
    assert.match(RELEASE, /Открыть канал MAX/);
    assert.match(RELEASE, /Перейти к посту MAX/);
    assert.match(RELEASE, /6 часов/);
    assert.match(RELEASE, /cityId \+ cityName/);
    assert.match(RELEASE, /exact match/i);
    assert.match(RELEASE, /fuzzy/i);
    assert.match(RELEASE, /каждые 15 секунд/);
    assert.match(RELEASE, /SCHEDULED -> PUBLISHING/);
    assert.match(RELEASE, /fit: contain/);
    assert.match(RELEASE, /Новой Prisma migration.*нет/isu);
    assert.match(RELEASE, /20260831100000_add_editorial_publisher/);
    assert.ok(RELEASE.includes(MAX3_URL));
    assert.match(RELEASE, /MAX_EDITORIAL_CHANNEL_3_ID/);
    assert.match(RELEASE, /editorial\.max\.binding\.MAX_CHANNEL_3/);
    assert.match(RELEASE, /backend остаётся `ab-afisha\/backend:backend-release-213e507`/i);
    assert.match(RELEASE, /bots остаются `ab-afisha\/bots:bots-release-3a64511`/i);
    assert.match(RELEASE, /nginx не пересоздаётся/i);
    assert.match(RELEASE, /ai\.ab-event\.pro/);
  });

  test('compose pins 213e507 backend, afc024c frontend and preserves bots', () => {
    assert.match(COMPOSE, /image: \$\{BACKEND_IMAGE:-ab-afisha\/backend:backend-release-213e507\}/);
    assert.match(COMPOSE, /image: \$\{BOTS_IMAGE:-ab-afisha\/bots:bots-release-3a64511\}/);
    assert.match(COMPOSE, /image: \$\{FRONTEND_IMAGE:-ab-afisha\/frontend:frontend-release-afc024c\}/);
    assert.match(COMPOSE, /MAX_EDITORIAL_CHANNEL_1_ID: \$\{MAX_EDITORIAL_CHANNEL_1_ID:-\}/);
    assert.match(COMPOSE, /MAX_EDITORIAL_CHANNEL_2_ID: \$\{MAX_EDITORIAL_CHANNEL_2_ID:-\}/);
    assert.match(COMPOSE, /MAX_EDITORIAL_CHANNEL_3_ID: \$\{MAX_EDITORIAL_CHANNEL_3_ID:-\}/);
    assert.match(COMPOSE, /uploads:\/app\/apps\/backend\/uploads/);
    assert.doesNotMatch(COMPOSE, /APP_VERSION/);
  });

  test('locks the mobile footer notebook crop without changing the shared bitmap contract', () => {
    assert.match(MOBILE_FOOTER_ARTWORK, /\.pub-footer-stationery-piece\s*\{[\s\S]*?overflow:\s*hidden\s*!important/);
    assert.match(MOBILE_FOOTER_TUNING, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?width:\s*129px\s*!important/);
    assert.match(MOBILE_FOOTER_TUNING, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?height:\s*174px\s*!important/);
    assert.match(MOBILE_FOOTER_TUNING, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?width:\s*180px\s*!important/);
    assert.match(MOBILE_FOOTER_TUNING, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*10px\s*!important/);
    assert.match(MOBILE_FOOTER_TUNING, /\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?right:\s*8px\s*!important/);
    assert.match(MOBILE_FOOTER_TEST, /notebook right edge and bottom leaves/);
  });

  test('skips canonical MAX link repair for private channels and caches visibility', () => {
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /CHANNEL_VISIBILITY_TTL_MS = 6 \* 60 \* 60 \* 1000/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /\/chats\/\$\{encodeURIComponent\(String\(sourceChannelId\)\)\}/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /data\.is_public === true/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /if \(!isPublic\)/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /source channel is private/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /message\.url/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /message_ids/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /message\.recipient\?\.chat_id !== sourceChannelId/);
    assert.match(MAX_SOURCE_POST_LINK_SERVICE, /@Cron\('\*\/1 \* \* \* \*'/);
    assert.doesNotMatch(MAX_SOURCE_POST_LINK_SERVICE, /\?mid=/);
  });

  test('protects exact MAX source preview and validates message identity', () => {
    assert.match(MAIN_EVENTS_CONTROLLER, /@Get\('admin\/:id\/source-preview'\)/);
    assert.match(MAIN_EVENTS_CONTROLLER, /@Roles\('ADMIN', 'EDITOR'\)/);
    assert.match(MAIN_EVENTS_CONTROLLER, /maxSourcePreviewService\.getEventSourcePreview\(id\)/);
    assert.match(MAX_SOURCE_PREVIEW_SERVICE, /\/messages\/\$\{encodeURIComponent\(event\.externalId\)\}/);
    assert.match(MAX_SOURCE_PREVIEW_SERVICE, /returnedMid !== event\.externalId/);
    assert.match(MAX_SOURCE_PREVIEW_SERVICE, /returnedChatId !== configuredChatId/);
    assert.match(MAX_SOURCE_PREVIEW_SERVICE, /directPostUrl/);
    assert.match(MAX_SOURCE_PREVIEW_SERVICE, /attachments/);
    assert.match(MAX_SOURCE_PREVIEW_SERVICE, /isPublic: chat\?\.is_public === true/);
  });

  test('renders exact MAX source post in the event editor without fake permalink', () => {
    assert.match(EVENT_EDIT_PAGE, /MaxSourcePreviewCard/);
    assert.match(EVENT_EDIT_PAGE, /<MaxSourcePreviewCard event=\{event\} \/>/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /\/events\/admin\/\$\{eventId\}\/source-preview/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /Исходный пост MAX/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /preview\?\.message\?\.attachments/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /preview\.message\.text/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /Канал MAX приватный/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /Открыть канал MAX/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /Перейти к посту MAX/);
    assert.match(MAX_SOURCE_PREVIEW_CARD, /directPostUrl \? 'Перейти к посту MAX' : 'Открыть канал MAX'/);
    assert.match(EVENT_EDIT_PAGE, /Ссылка на источник/);
    assert.match(EVENT_EDIT_PAGE, /value=\{sourcePostUrl\}/);
    assert.match(EVENT_EDIT_PAGE, /sourcePostUrl\.includes\('\/join\/'\) \? 'Открыть канал MAX' : 'Перейти на источник'/);
    assert.match(SOURCE_LINK_TEST, /Открыть канал MAX/);
    assert.doesNotMatch(EVENT_EDIT_PAGE, /NeedsAttentionMaxSourceLink/);
    assert.doesNotMatch(EVENT_EDIT_PAGE, />\s*Перейти к событию\s*</);
  });

  test('locks rolling main-events contract with completed fallback only below five active items', () => {
    assert.match(MAIN_EVENTS_SERVICE, /in: \[EventAutoStatus\.PLANNED, EventAutoStatus\.LIVE\]/);
    assert.match(MAIN_EVENTS_SERVICE, /if \(activeEvents\.length >= MAIN_EVENTS_WINDOW_SIZE\)/);
    assert.match(MAIN_EVENTS_SERVICE, /autoStatus: EventAutoStatus\.COMPLETED/);
    assert.match(MAIN_EVENTS_SERVICE, /take: MAIN_EVENTS_WINDOW_SIZE - activeEvents\.length/);
    assert.match(MAIN_EVENTS_SERVICE, /return \[\.\.\.activeEvents, \.\.\.completedEvents\]/);
    assert.match(MAIN_EVENTS_CONTROLLER, /await this\.mainEventsService\.getMainEvents\(\)/);
    const publicMainHandler = MAIN_EVENTS_CONTROLLER.match(
      /@Get\('public\/main'\)[\s\S]*?\n  \}\n\n  @Get\('public\/:id'\)/,
    )?.[0] ?? '';
    assert.doesNotMatch(publicMainHandler, /slice\(0,\s*5\)/);
    assert.match(MAIN_EVENTS_ROLLING_TEST, /1, 2, 3, 4, 5/);
    assert.match(MAIN_EVENTS_ROLLING_TEST, /2, 3, 4, 5, 6/);
    assert.match(MAIN_EVENTS_ROLLING_TEST, /3, 4, 5, 6, 7/);
  });

  test('locks third MAX target and unique binding contract', () => {
    for (const content of [EDITORIAL_SERVICE, EDITORIAL_DISCOVERY]) {
      assert.match(content, /MAX_CHANNEL_3/);
      assert.match(content, /MAX_EDITORIAL_CHANNEL_3_ID/);
      assert.ok(content.includes(MAX3_URL));
      assert.match(content, /Макс - "АБ\| Пратнер"/);
    }
    assert.match(EDITORIAL_DISCOVERY, /editorial\.max\.binding\.MAX_CHANNEL_3/);
    const maxLinks = [...EDITORIAL_SERVICE.matchAll(/publicUrl: '(https:\/\/max\.ru\/join\/[^']+)'/g)].map((match) => match[1]);
    assert.equal(maxLinks.length, 3);
    assert.equal(new Set(maxLinks).size, 3);
  });

  test('uses existing editorial scheduledAt without a new schema migration', () => {
    assert.match(BACKEND_ENTRYPOINT, /pnpm exec prisma migrate deploy/);
    assert.match(PRISMA_SCHEMA, /model EditorialPost[\s\S]*scheduledAt\s+DateTime\?/);
    assert.match(EDITORIAL_MIGRATION, /CREATE TABLE "EditorialPost"/);
    assert.match(EDITORIAL_MIGRATION, /"scheduledAt" TIMESTAMP\(3\)/);
    assert.doesNotMatch(EDITORIAL_MIGRATION, /DROP TABLE/i);
    assert.match(EDITORIAL_SCHEDULER, /@Cron\('\*\/15 \* \* \* \* \*'\)/);
    assert.match(EDITORIAL_SCHEDULER, /status:\s*'SCHEDULED'/);
    assert.match(EDITORIAL_SCHEDULER, /status:\s*'PUBLISHING'/);
    assert.match(EDITORIAL_SCHEDULER, /updateMany\(\{/);
  });

  test('locks non-cropping image processing and redesigned common preview', () => {
    assert.match(EDITORIAL_IMAGE_SERVICE, /fit:\s*'contain'/);
    assert.doesNotMatch(EDITORIAL_IMAGE_SERVICE, /fit:\s*'cover'/);
    assert.match(EDITORIAL_IMAGE_SERVICE, /40|SUPPORTED_FORMATS/);
    assert.match(EDITORIAL_PUBLISHER, /Общий предварительный просмотр/);
    assert.match(EDITORIAL_PUBLISHER, /Макс - "АБ Афиша бухгалтера простая"/);
    assert.match(EDITORIAL_PUBLISHER, /Макс - "АБ\| Афиша бухгалтера"/);
    assert.match(EDITORIAL_PUBLISHER, /ChannelColumn title="Макс"/);
    assert.match(EDITORIAL_PUBLISHER, /ChannelColumn title="ТГ"/);
    assert.doesNotMatch(EDITORIAL_PUBLISHER, /previewPlatform/);
    assert.match(EDITORIAL_PUBLISHER, /const failures: string\[\] = \[\]/);
    assert.match(EDITORIAL_PUBLISHER, /if \(uploaded\.length\)/);
    assert.match(EDITORIAL_PUBLISHER, /\/editorial\/posts\/\$\{id\}\/schedule/);
    assert.match(EDITORIAL_PUBLISHER, /channels\.filter\(\(channel\) => channel\.platform === 'MAX'\)/);
  });

  test('requires compiled MAX parser regression in CI for the pinned backend', () => {
    assert.match(CI, /Compiled MAX parser runtime regression tests/);
    assert.match(CI, /node --test apps\/backend\/test\/max-parser-runtime\.test\.mjs/);
    assert.match(MAX_RUNTIME_TEST, /Экспофорум, Санкт-Петербург/);
    assert.match(MAX_RUNTIME_TEST, /assert\.equal\(parsed\.venue, 'Экспофорум'\)/);
    assert.match(MAX_RUNTIME_TEST, /assert\.notEqual\(parsed\.venue, parsed\.city\)/);
    assert.match(MAX_RUNTIME_TEST, /'ст1', 'Очно', 'Экспофорум'/);
  });

  test('current promotion uses frontend-only deploy and preserves backend, bots and nginx', () => {
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_COMMIT/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_IMAGE/);
    assert.match(FRONTEND_DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(FRONTEND_DEPLOY, /up -d --no-deps --force-recreate frontend/);
    assert.doesNotMatch(FRONTEND_DEPLOY, /force-recreate backend/);
    assert.doesNotMatch(FRONTEND_DEPLOY, /force-recreate bots/);
    assert.doesNotMatch(FRONTEND_DEPLOY, /force-recreate nginx/);
    assert.match(FRONTEND_DEPLOY, /АВТОМАТИЧЕСКИЙ ОТКАТ FRONTEND/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_PIN_OK/);
    assert.match(RELEASE, /backend.*не пересоздаётся/isu);
    assert.match(RELEASE, /bots.*не пересозда/isu);
    assert.match(RELEASE, /nginx не пересоздаётся/i);
  });

  test('backend+frontend deploy remains available and preserves bots/nginx', () => {
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_RELEASE_COMMIT/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_BACKEND_COMMIT/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_COMMIT/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_BOTS_IMAGE/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /force-recreate backend/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /force-recreate frontend/);
    assert.doesNotMatch(BACKEND_FRONTEND_DEPLOY, /force-recreate bots/);
    assert.doesNotMatch(BACKEND_FRONTEND_DEPLOY, /force-recreate nginx/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND И FRONTEND/);
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_BACKEND_FRONTEND_PIN_OK=true/);
  });

  test('backend-only deploy validates revision and changes only backend', () => {
    assert.match(BACKEND_DEPLOY, /PRODUCTION_BACKEND_COMMIT/);
    assert.match(BACKEND_DEPLOY, /PRODUCTION_BACKEND_IMAGE/);
    assert.match(BACKEND_DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(BACKEND_DEPLOY, /up -d --no-deps --force-recreate backend/);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate frontend/);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate bots/);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate nginx/);
  });

  test('backend-only deploy refreshes nginx DNS without recreating nginx', () => {
    assert.match(BACKEND_DEPLOY, /reload_nginx\(\)/);
    assert.match(BACKEND_DEPLOY, /docker exec "\$container" nginx -t/);
    assert.match(BACKEND_DEPLOY, /docker exec "\$container" nginx -s reload/);
    assert.equal((BACKEND_DEPLOY.match(/reload_nginx "\$NGINX_BEFORE"/g) ?? []).length, 2);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate nginx/);
  });

  test('backend-only deploy keeps canonical city and Telegram runtime checks', () => {
    assert.match(BACKEND_DEPLOY, /family: 6/);
    assert.match(BACKEND_DEPLOY, /BACKEND_TELEGRAM_GET_ME_OK=true/);
    assert.match(BACKEND_DEPLOY, /CANONICAL_CITY_RUNTIME_OK=true/);
    assert.match(BACKEND_DEPLOY, /LEGACY_UNRESOLVED_PUBLISHED_LOCATIONS/);
  });

  test('component-specific deploy paths remain available', () => {
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_BACKEND_FRONTEND_PIN_OK=true/);
    assert.match(BACKEND_BOTS_DEPLOY, /PRODUCTION_BACKEND_BOTS_PIN_OK=true/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_PIN_OK/);
  });

  test('frontend cleanup protects the pinned frontend image', () => {
    assert.match(CLEANUP, /refusing cleanup: production does not use pinned image/);
    assert.match(CLEANUP, /ONLY_PINNED_FRONTEND_IMAGE_REMAINS=true/);
    assert.match(CLEANUP, /SKIP_RUNNING_CONTAINER/);
  });

  test('keeps all production scripts valid Bash', () => {
    for (const path of [
      BACKEND_DEPLOY_PATH,
      BACKEND_FRONTEND_DEPLOY_PATH,
      BACKEND_BOTS_DEPLOY_PATH,
      APP_DEPLOY_PATH,
      FRONTEND_DEPLOY_PATH,
      CLEANUP_PATH,
      IPV6_HOST_PATH,
    ]) {
      execFileSync('bash', ['-n', path], { stdio: 'pipe' });
    }
  });
});
