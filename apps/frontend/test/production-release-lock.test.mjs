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

const RELEASE_ANCHOR = 'ad481442ed706986b62d1388f0e10fb5c5263c4c';
const BACKEND_COMMIT = RELEASE_ANCHOR;
const BACKEND_TAG = 'backend-release-ad48144';
const BACKEND_IMAGE = `ab-afisha/backend:${BACKEND_TAG}`;
const BOTS_COMMIT = '3a64511c98f7bf8cd59776dd5dce233939cd2988';
const BOTS_TAG = 'bots-release-3a64511';
const BOTS_IMAGE = `ab-afisha/bots:${BOTS_TAG}`;
const FRONTEND_COMMIT = '3b70ea58e9284e8e590eb7bf08a0c394000ebcd2';
const FRONTEND_TAG = 'frontend-release-3b70ea5';
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
  });

  test('documents exact backend-only release pins and deploy path', () => {
    for (const content of [RELEASE, AGENTS, CLAUDE]) {
      assert.match(content, new RegExp(RELEASE_ANCHOR));
      assert.match(content, new RegExp(BACKEND_IMAGE));
      assert.match(content, new RegExp(BOTS_COMMIT));
      assert.match(content, new RegExp(BOTS_IMAGE));
      assert.match(content, new RegExp(FRONTEND_COMMIT));
      assert.match(content, new RegExp(FRONTEND_IMAGE));
      assert.match(content, /deploy-pinned-backend\.sh/);
    }
    assert.match(RELEASE, /единственный источник истины \(SSOT\)/i);
    assert.match(RELEASE, /Город очного участия не определён или требует проверки/);
    assert.match(RELEASE, /Frontend остаётся на `3b70ea5`/);
    assert.match(RELEASE, /Bots остаются на `3a64511`/);
  });

  test('compose pins the new backend while preserving frontend and bots', () => {
    assert.match(COMPOSE, /image: \$\{BACKEND_IMAGE:-ab-afisha\/backend:backend-release-ad48144\}/);
    assert.match(COMPOSE, /image: \$\{BOTS_IMAGE:-ab-afisha\/bots:bots-release-3a64511\}/);
    assert.match(COMPOSE, /image: \$\{FRONTEND_IMAGE:-ab-afisha\/frontend:frontend-release-3b70ea5\}/);
    assert.doesNotMatch(COMPOSE, /APP_VERSION/);
  });

  test('backend-only deploy validates revision and changes only backend', () => {
    assert.match(BACKEND_DEPLOY, /PRODUCTION_BACKEND_COMMIT/);
    assert.match(BACKEND_DEPLOY, /PRODUCTION_BACKEND_IMAGE/);
    assert.match(BACKEND_DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(BACKEND_DEPLOY, /up -d --no-deps --force-recreate backend/);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate frontend/);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate bots/);
    assert.doesNotMatch(BACKEND_DEPLOY, /force-recreate nginx/);
    assert.match(BACKEND_DEPLOY, /АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND/);
    assert.doesNotMatch(BACKEND_DEPLOY, /АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND И FRONTEND/);
    assert.doesNotMatch(BACKEND_DEPLOY, /АВТОМАТИЧЕСКИЙ ОТКАТ BACKEND \+ BOTS/);
  });

  test('backend-only deploy checks canonical city runtime and Telegram IPv6 with retry', () => {
    assert.match(BACKEND_DEPLOY, /family: 6/);
    assert.match(BACKEND_DEPLOY, /for attempt in 1 2 3 4 5 6/);
    assert.match(BACKEND_DEPLOY, /BACKEND_TELEGRAM_GET_ME_OK=true/);
    assert.match(BACKEND_DEPLOY, /CANONICAL_CITY_RUNTIME_OK=true/);
    assert.match(BACKEND_DEPLOY, /Canonical public city missing/);
    assert.match(BACKEND_DEPLOY, /Invalid active City catalogue row/);
    assert.match(BACKEND_DEPLOY, /LEGACY_UNRESOLVED_PUBLISHED_LOCATIONS/);
    assert.match(BACKEND_DEPLOY, /активный город из справочника/);
    assert.match(BACKEND_DEPLOY, /Город очного участия не определён или требует проверки/);
  });

  test('backend-only deploy preserves frontend bots nginx and local files', () => {
    assert.match(BACKEND_DEPLOY, /FRONTEND_UNCHANGED=true/);
    assert.match(BACKEND_DEPLOY, /BOTS_UNCHANGED=true/);
    assert.match(BACKEND_DEPLOY, /NGINX_UNCHANGED=true/);
    assert.match(BACKEND_DEPLOY, /LOCAL_CHANGES_PRESERVED=true/);
    assert.match(BACKEND_DEPLOY, /PRODUCTION_BACKEND_PIN_OK=true/);
    assert.match(BACKEND_DEPLOY, /NGINX_CONFIG_SHA_BEFORE/);
    assert.match(BACKEND_DEPLOY, /GIT_STATUS_BEFORE/);
  });

  test('other component-specific deploy paths remain available but are not current', () => {
    assert.match(BACKEND_FRONTEND_DEPLOY, /PRODUCTION_BACKEND_FRONTEND_PIN_OK=true/);
    assert.match(BACKEND_BOTS_DEPLOY, /PRODUCTION_BACKEND_BOTS_PIN_OK=true/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_PIN_OK/);
  });

  test('frontend cleanup protects the currently pinned frontend image', () => {
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
