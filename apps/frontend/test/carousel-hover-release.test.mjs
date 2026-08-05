import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCRIPT = readFileSync(
  resolve(ROOT, 'infra/scripts/deploy-carousel-hover-frontend.sh'),
  'utf8',
);

describe('Carousel hover frontend release', () => {
  test('verifies the approved hover animation in source and runtime CSS', () => {
    assert.match(SCRIPT, /scale: 1\.04;/);
    assert.match(SCRIPT, /scale 180ms cubic-bezier/);
    assert.match(SCRIPT, /CAROUSEL_HOVER_SCALE_104/);
    assert.match(SCRIPT, /CAROUSEL_HOVER_FINE_POINTER/);
    assert.match(SCRIPT, /CAROUSEL_DRAG_GUARD/);
    assert.match(SCRIPT, /REDUCED_MOTION_SCALE_RESET/);
  });

  test('runs frontend typecheck, all frontend tests, build and preflight', () => {
    assert.match(SCRIPT, /pnpm --filter frontend typecheck/);
    assert.match(SCRIPT, /node --test apps\/frontend\/test\/\*\.test\.mjs/);
    assert.match(SCRIPT, /apps\/frontend\/Dockerfile/);
    assert.match(SCRIPT, /PREFLIGHT_OK/);
    assert.match(SCRIPT, /PRODUCTION_HOVER_CONTRACTS_OK/);
  });

  test('switches only frontend and preserves backend bots and nginx', () => {
    assert.match(
      SCRIPT,
      /dc up -d --no-deps --force-recreate frontend/,
    );
    assert.doesNotMatch(
      SCRIPT,
      /dc up -d --no-deps --force-recreate (?:backend|bots|nginx)/,
    );
    assert.match(SCRIPT, /BACKEND_UNCHANGED/);
    assert.match(SCRIPT, /BOTS_UNCHANGED/);
    assert.match(SCRIPT, /NGINX_PRESERVED/);
  });

  test('keeps automatic rollback and a definitive success marker', () => {
    assert.match(SCRIPT, /rollback\(\)/);
    assert.match(SCRIPT, /ROLLBACK_IMAGE/);
    assert.match(SCRIPT, /DEPLOY_FAILED/);
    assert.match(SCRIPT, /DEPLOY_OK/);
  });
});
