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

const RELEASE_ANCHOR = '8aeecd1140812f6c92941146cdd4fba671ae8c93';
const BACKEND_COMMIT = RELEASE_ANCHOR;
const BACKEND_TAG = 'backend-release-8aeecd1';
const BACKEND_IMAGE = `ab-afisha/backend:${BACKEND_TAG}`;
const BOTS_COMMIT = '3a64511c98f7bf8cd59776dd5dce233939cd2988';
const BOTS_TAG = 'bots-release-3a64511';
const BOTS_IMAGE = `ab-afisha/bots:${BOTS_TAG}`;
const FRONTEND_COMMIT = '4d8daa1b069ee8f69f5a43c808cf7506de71d5c9';
const FRONTEND_TAG = 'frontend-release-4d8daa1';
const FRONTEND_IMAGE = `ab-afisha/frontend:${FRONTEND_TAG}`;

describe('Pinned production component release', () => {
  test('defines independent machine-readable pins for backend, bots and frontend', () => {
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
    assert.match(LOCK, /PRODUCTION_RELEASE_APPROVED_AT=2026-08-28/);
  });

  test('documents exact frontend-only release pins and deploy path', () => {
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
    assert.match(RELEASE, /Frontend обновлён до `4d8daa1`/);
    assert.match(RELEASE, /backend остаётся на `8aeecd1`/i);
    assert.match(RELEASE, /bots остаются на `3a64511`/i);
    assert.match(RELEASE, /390 px/);
    assert.match(RELEASE, /PR #112/);
    assert.match(RELEASE, /Контакты/);
    assert.match(RELEASE, /календарь/iu);
    assert.match(RELEASE, /белый фон/iu);
    assert.match(RELEASE, /свайп/iu);
    assert.match(RELEASE, /notebook-stationery\.png/);
    assert.match(RELEASE, /сентября/);
    assert.match(RELEASE, /Экспофорум/);
    assert.match(RELEASE, /compiled MAX parser runtime/i);
  });

  test('compose pins current backend, frontend and bots images', () => {
    assert.match(COMPOSE, /image: \$\{BACKEND_IMAGE:-ab-afisha\/backend:backend-release-8aeecd1\}/);
    assert.match(COMPOSE, /image: \$\{BOTS_IMAGE:-ab-afisha\/bots:bots-release-3a64511\}/);
    assert.match(COMPOSE, /image: \$\{FRONTEND_IMAGE:-ab-afisha\/frontend:frontend-release-4d8daa1\}/);
    assert.doesNotMatch(COMPOSE, /APP_VERSION/);
  });

  test('requires compiled MAX parser regression in CI for the pinned backend', () => {
    assert.match(CI, /Compiled MAX parser runtime regression tests/);
    assert.match(CI, /node --test apps\/backend\/test\/max-parser-runtime\.test\.mjs/);
    assert.match(MAX_RUNTIME_TEST, /Экспофорум, Санкт-Петербург/);
    assert.match(MAX_RUNTIME_TEST, /assert\.equal\(parsed\.venue, 'Экспофорум'\)/);
    assert.match(MAX_RUNTIME_TEST, /assert\.notEqual\(parsed\.venue, parsed\.city\)/);
    assert.match(MAX_RUNTIME_TEST, /'ст1', 'Очно', 'Экспофорум'/);
  });

  test('frontend-only deploy reads the production pin and changes only frontend', () => {
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_COMMIT/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_IMAGE/);
    assert.match(FRONTEND_DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(FRONTEND_DEPLOY, /up -d --no-deps --force-recreate frontend/);
    assert.doesNotMatch(FRONTEND_DEPLOY, /force-recreate backend/);
    assert.doesNotMatch(FRONTEND_DEPLOY, /force-recreate bots/);
    assert.doesNotMatch(FRONTEND_DEPLOY, /force-recreate nginx/);
    assert.match(FRONTEND_DEPLOY, /АВТОМАТИЧЕСКИЙ ОТКАТ FRONTEND/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_PIN_OK/);
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
