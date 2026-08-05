import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCRIPT = readFileSync(
  resolve(ROOT, 'infra/scripts/promote-built-max-ingestion.sh'),
  'utf8',
);

describe('Verified built MAX ingestion promotion', () => {
  test('uses the validated public-events page limit', () => {
    assert.match(SCRIPT, /page=1&limit=50/);
    assert.doesNotMatch(SCRIPT, /page=1&limit=100/);
  });

  test('verifies all three reported dates and titles', () => {
    assert.match(SCRIPT, /2026-07-30/);
    assert.match(SCRIPT, /2026-08-04/);
    assert.match(SCRIPT, /2026-08-05/);
    assert.match(SCRIPT, /АВТОУСН/);
    assert.match(SCRIPT, /ФНС УЖЕ ВИДИТ РИСКИ/);
    assert.match(SCRIPT, /КАДРОВЫЕ ИЗМЕНЕНИЯ ИДУТ/);
  });

  test('checks DB, internal API, public API, calendar and main carousel', () => {
    assert.match(SCRIPT, /PrismaClient/);
    assert.match(SCRIPT, /INTERNAL_API/);
    assert.match(SCRIPT, /PUBLIC_API/);
    assert.match(SCRIPT, /public\/calendar/);
    assert.match(SCRIPT, /public\/main/);
    assert.match(SCRIPT, /EVENT_RECOVERY_OK/);
  });

  test('keeps automatic rollback and service isolation', () => {
    assert.match(SCRIPT, /function|rollback\(\)/);
    assert.match(SCRIPT, /APP_VERSION="\$ROLLBACK_TAG"/);
    assert.match(SCRIPT, /bots_after/);
    assert.match(SCRIPT, /nginx_after/);
    assert.match(SCRIPT, /DEPLOY_OK/);
  });
});
