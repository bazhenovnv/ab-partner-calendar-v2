import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(FRONTEND, '../..');
const CITIES_PAGE = readFileSync(
  resolve(FRONTEND, 'src/app/admin/cities/page.tsx'),
  'utf8',
);
const CITIES_SERVICE = readFileSync(
  resolve(ROOT, 'apps/backend/src/modules/cities/cities.service.ts'),
  'utf8',
);
const MAX_PARSER = readFileSync(
  resolve(ROOT, 'apps/backend/src/modules/max-import/max-parser.service.ts'),
  'utf8',
);

describe('City catalogue reconciliation', () => {
  test('admin can reconcile the city catalogue from event data', () => {
    assert.match(CITIES_PAGE, /\/admin\/cities\/reconcile/);
    assert.match(CITIES_PAGE, /Синхронизировать из мероприятий/);
    assert.match(CITIES_SERVICE, /async reconcileFromEvents\(\)/);
    assert.match(CITIES_SERVICE, /cityId: city\.id, cityName: city\.name/);
  });

  test('empty catalogue triggers a one-time reconciliation', () => {
    assert.match(CITIES_PAGE, /res\.total === 0/);
    assert.match(CITIES_PAGE, /didAutoReconcile\.current/);
  });

  test('venue-first offline addresses are repaired to a real city', () => {
    assert.match(MAX_PARSER, /repairVenueFirstLocation\(result\)/);
    assert.match(MAX_PARSER, /VENUE_PREFIX/);
    assert.match(MAX_PARSER, /result\.venue = result\.venue \?\? result\.city/);
    assert.match(MAX_PARSER, /result\.city = candidate/);
  });
});
