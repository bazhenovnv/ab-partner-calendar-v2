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
const DEPLOY_PATH = resolve(ROOT, 'infra/scripts/deploy-pinned-frontend.sh');
const CLEANUP_PATH = resolve(ROOT, 'infra/scripts/cleanup-old-frontend-releases.sh');
const DEPLOY = read('infra/scripts/deploy-pinned-frontend.sh');
const CLEANUP = read('infra/scripts/cleanup-old-frontend-releases.sh');

const COMMIT = '9fbfbc5d710f4b29163ca176b86e0330586c3d59';
const TAG = 'frontend-release-9fbfbc5';
const IMAGE = `ab-afisha/frontend:${TAG}`;

describe('Pinned production frontend release', () => {
  test('defines one machine-readable production commit and image', () => {
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_COMMIT=${COMMIT}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_TAG=${TAG}`));
    assert.match(LOCK, new RegExp(`PRODUCTION_FRONTEND_IMAGE=${IMAGE}`));
  });

  test('documents the release as the production SSOT for future agents', () => {
    assert.match(RELEASE, /единственный источник истины \(SSOT\)/i);
    assert.match(RELEASE, new RegExp(COMMIT));
    assert.match(RELEASE, new RegExp(IMAGE));
    assert.match(AGENTS, /PRODUCTION_RELEASE\.md/);
    assert.match(CLAUDE, /PRODUCTION_RELEASE\.md/);
  });

  test('pins compose independently from the shared APP_VERSION', () => {
    assert.match(
      COMPOSE,
      /image: \$\{FRONTEND_IMAGE:-ab-afisha\/frontend:frontend-release-9fbfbc5\}/,
    );
    assert.doesNotMatch(COMPOSE, /frontend:\s*[\s\S]*?image: ab-afisha\/frontend:\$\{APP_VERSION/);
  });

  test('deploys only the locked image and validates its revision', () => {
    assert.match(DEPLOY, /source "\$LOCK_FILE"/);
    assert.match(DEPLOY, /PRODUCTION_FRONTEND_IMAGE/);
    assert.match(DEPLOY, /org\.opencontainers\.image\.revision/);
    assert.match(DEPLOY, /up -d --no-deps --force-recreate frontend/);
    assert.match(DEPLOY, /PRODUCTION_PIN_OK/);
  });

  test('cleanup refuses to run unless production already uses the pinned image', () => {
    assert.match(CLEANUP, /refusing cleanup: production does not use pinned image/);
    assert.match(CLEANUP, /ONLY_PINNED_FRONTEND_IMAGE_REMAINS=true/);
    assert.match(CLEANUP, /SKIP_RUNNING_CONTAINER/);
  });

  test('keeps both production scripts valid Bash', () => {
    execFileSync('bash', ['-n', DEPLOY_PATH], { stdio: 'pipe' });
    execFileSync('bash', ['-n', CLEANUP_PATH], { stdio: 'pipe' });
  });
});
