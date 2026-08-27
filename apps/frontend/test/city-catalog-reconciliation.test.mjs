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
const FILTERS_SERVICE = readFileSync(
  resolve(ROOT, 'apps/backend/src/modules/filters/filters.service.ts'),
  'utf8',
);
const FRONTEND_API = readFileSync(
  resolve(FRONTEND, 'src/lib/api.ts'),
  'utf8',
);
const MAX_PARSER = readFileSync(
  resolve(ROOT, 'apps/backend/src/modules/max-import/max-parser.service.ts'),
  'utf8',
);

describe('City catalogue reconciliation', () => {
  test('admin can reconcile canonical cities from offline and hybrid event data', () => {
    assert.match(CITIES_PAGE, /\/admin\/cities\/reconcile/);
    assert.match(CITIES_PAGE, /Синхронизировать из мероприятий/);
    assert.match(CITIES_SERVICE, /async reconcileFromEvents\(\)/);
    assert.match(CITIES_SERVICE, /format: \{ in: \['OFFLINE', 'HYBRID'\] \}/);
    assert.match(CITIES_SERVICE, /extractCityFromEventLocation/);
    assert.match(CITIES_SERVICE, /cityId: city\.id/);
    assert.match(CITIES_SERVICE, /cityNameIsSimple/);
  });

  test('public city filter is derived from published event locations and keeps aliases', () => {
    assert.match(FILTERS_SERVICE, /this\.citiesForWhere/);
    assert.match(FILTERS_SERVICE, /status: 'PUBLISHED'/);
    assert.match(FILTERS_SERVICE, /extractCityFromEventLocation/);
    assert.match(FILTERS_SERVICE, /filterValues: new Set/);
    assert.match(FRONTEND_API, /\.\.\.\(city\.filterValues \?\? \[\]\)/);
  });

  test('public city options exclude disabled cities and address-only orphan locations', () => {
    assert.match(FILTERS_SERVICE, /select: \{ id: true, name: true, region: true, isActive: true \}/);
    assert.match(FILTERS_SERVICE, /if \(linkedCity && !linkedCity\.isActive\) continue/);
    assert.match(FILTERS_SERVICE, /inactiveCityNames\.has\(normalizedName\)/);
    assert.match(
      FILTERS_SERVICE,
      /OR: \[\s*\{ cityId: \{ not: null \} \},\s*\{ cityName: \{ not: null \} \},\s*\]/,
    );
  });

  test('city facets use exact aliases instead of arbitrary address or venue substrings', () => {
    assert.match(FILTERS_SERVICE, /cityName: \{ equals: city, mode: 'insensitive' \}/);
    assert.match(FILTERS_SERVICE, /city: \{ name: \{ equals: city, mode: 'insensitive' \} \}/);
    assert.doesNotMatch(FILTERS_SERVICE, /address: \{ contains: city/);
    assert.doesNotMatch(FILTERS_SERVICE, /venue: \{ contains: city/);
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
