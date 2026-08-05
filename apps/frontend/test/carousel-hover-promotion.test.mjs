import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCRIPT = readFileSync(
  resolve(ROOT, 'infra/scripts/promote-built-carousel-hover.sh'),
  'utf8',
);

describe('Built carousel hover promotion', () => {
  test('accepts minified transition timing and hashed CSS module selectors', () => {
    assert.match(SCRIPT, /180ms\|\\\.18s/);
    assert.match(SCRIPT, /finePointerTail/);
    assert.match(SCRIPT, /notCount >= 2/);
    assert.doesNotMatch(
      SCRIPT,
      /compact\.includes\('\.gallery:not\(\.gallerydragging\)'\)/,
    );
  });

  test('verifies the actual hover contract before and after promotion', () => {
    assert.match(SCRIPT, /CAROUSEL_HOVER_SCALE_104/);
    assert.match(SCRIPT, /CAROUSEL_HOVER_TRANSITION/);
    assert.match(SCRIPT, /CAROUSEL_DRAG_GUARD/);
    assert.match(SCRIPT, /verify_hover_runtime "\$PREFLIGHT"/);
    assert.match(SCRIPT, /verify_hover_runtime "\$new_frontend"/);
  });

  test('promotes only the existing frontend image with rollback protection', () => {
    assert.match(SCRIPT, /docker image inspect "\$IMAGE"/);
    assert.match(SCRIPT, /dc up -d --no-deps --force-recreate frontend/);
    assert.doesNotMatch(
      SCRIPT,
      /dc up -d --no-deps --force-recreate (?:backend|bots|nginx)/,
    );
    assert.match(SCRIPT, /PROMOTION_FAILED/);
    assert.match(SCRIPT, /DEPLOY_OK/);
  });
});
