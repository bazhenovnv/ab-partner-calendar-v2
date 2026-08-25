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
const APP_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-app.sh');
const FRONTEND_DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-frontend.sh');
const CLEANUP_PATH = resolve(ROOT, 'infra/scripts/cleanup-old-frontend-releases.sh');
const APP_DEPLOY = read('infra/scripts/deploy-pinned-app.sh');
const FRONTEND_DEPLOY = read('infra/scripts/deploy-pinned-frontend.sh');
const CLEANUP = read('infra/scripts/cleanup-old-frontend-releases.sh');

const COMMIT = 'b676d1a7ce6a1d458e8a7d1e4267c6be4f58ae90';
const BACKEND_TAG = 'backend-release-b676d1a';
const BACKEND_IMAGE = `ab-afisha/backend:${BACKEND_TAG}`;
const FRONTEND_TAG = 'frontend-release-b676d1a';
const FRONTEND_IMAGE = `ab-afisha/frontend:${FRONTEND_TAG}`;

describe('Pinned production application release', () => {
  test('defines one machine-readable commit for backend and frontend', () => {
    assert.match(LOCK, new RegExp(`PRODUCTION_RELEASE_COMMIT=${COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BACKEND_COMMIT=${COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BACKEND_TAG=${BACKEND_TAG}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_BACKEND_IMAGE=${BACKEND_IMAGE}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_COMMIT=${COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_TAG=${FRONTEND_TAG}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_IMAGE=${FRONTEND_IMAGE}`));
  });

  test('documents the exact app release for future agents', () => {
    for (const content of [RELEASE, AGENTS, CLAUDE]) {
      assert.match(content, new RegExp(COMMIT));
      assert.match(content, new RegExp(BACKEND_IMAGE));
      assert.match(content, new RegExp(FRONTEND_IMAGE));
      assert.match(content, /deploy-pinned-app\.sh/);
    }
    assert.match(RELEASE, /единственный источник истины \(SSOT\)/i);
  });

  test('pins backend and frontend independently from the bots APP_VERSION', () => {
    assert.match(COMPOSE, /image: \$\{BACKEND_IMAGE:-ab-afisha\/backend:backend-release-b676d1a\}/);
    assert.match(COMPOSE, /image: \$\{FRONTEND_IMAGE:-ab-afisha\/frontend:frontend-release-b676d1a\}/);
    assert.match(COMPOSE, /bots:[\s\S]*?image: ab-afisha\/bots:\$\{APP_VERSION:-latest\}/);
    assert.doesNotMatch(COMPOSE, /backend:[\s\S]*?image: ab-afisha\/backend:\$\{APP_VERSION/);
    assert.doesNotMatch(COMPOSE, /frontend:[\s\S]*?image: ab-afisha\/frontend:\$\{APP_VERSION/);
  });

  test('full deploy validates revisions and switches only backend and frontend', () => {
    assert.match(APP_DEPLOY, /source "\$LOCK_FILE"/);
    assert.match(APP_DEPLOY, /PRODUCTION_BACKEND_IMAGE/);
    assert.match(APP_DEPLOY, /PRODUCTION_FRONTEND_IMAGE/);
    assert.match(APP_DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(APP_DEPLOY, /compose_with_images/);
    assert.match(APP_DEPLOY, /force-recreate backend/);
    assert.match(APP_DEPLOY, /force-recreate frontend/);
    assert.doesNotMatch(APP_DEPLOY, /force-recreate bots/);
    assert.doesNotMatch(APP_DEPLOY, /force-recreate nginx/);
    assert.match(APP_DEPLOY, /RECENT_BACKFILL_MARKER_REMOVED/);
    assert.match(APP_DEPLOY, /wait_reconciliation/);
    assert.match(APP_DEPLOY, /LATEST_MAX_EVENTS=/);
    assert.match(APP_DEPLOY, /PRODUCTION_APP_PIN_OK/);
    assert.match(APP_DEPLOY, /BOTS_UNCHANGED=true/);
    assert.match(APP_DEPLOY, /NGINX_PRESERVED=true/);
  });

  test('frontend-only deploy remains compatible with the shared lock', () => {
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_COMMIT/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_FRONTEND_IMAGE/);
    assert.match(FRONTEND_DEPLOY, /up -d --no-deps --force-recreate frontend/);
    assert.match(FRONTEND_DEPLOY, /PRODUCTION_PIN_OK/);
  });

  test('frontend cleanup still protects the pinned frontend image', () => {
    assert.match(CLEANUP, /refusing cleanup: production does not use pinned image/);
    assert.match(CLEANUP, /ONLY_PINNED_FRONTEND_IMAGE_REMAINS=true/);
    assert.match(CLEANUP, /SKIP_RUNNING_CONTAINER/);
  });

  test('keeps all production scripts valid Bash', () => {
    execFileSync('bash', ['-n', APP_DEPLOY_PATH], { stdio: 'pipe' });
    execFileSync('bash', ['-n', FRONTEND_DEPLOY_PATH], { stdio: 'pipe' });
    execFileSync('bash', ['-n', CLEANUP_PATH], { stdio: 'pipe' });
  });
});
