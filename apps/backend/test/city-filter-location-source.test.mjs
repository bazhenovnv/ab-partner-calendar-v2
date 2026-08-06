import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const FILTERS = readFileSync(
  resolve(ROOT, 'src/modules/filters/filters.service.ts'),
  'utf8',
);
const SHARED_LOCATION = readFileSync(
  resolve(ROOT, '../../../packages/shared/src/location-city.ts'),
  'utf8',
);

describe('public city filter location source', () => {
  test('uses only published event locations', () => {
    assert.match(FILTERS, /status: 'PUBLISHED'/);
    assert.match(FILTERS, /const usedCities = new Map<string, UsedCity>\(\)/);
    assert.doesNotMatch(FILTERS, /catalogueCities\.map\(\(city\) => \[locationKey/);
  });

  test('reads city relation, cityName, address and venue', () => {
    assert.match(FILTERS, /\{ cityId: \{ not: null \} \}/);
    assert.match(FILTERS, /\{ cityName: \{ not: null \} \}/);
    assert.match(FILTERS, /\{ address: \{ not: null \} \}/);
    assert.match(FILTERS, /\{ venue: \{ not: null \} \}/);
    assert.match(FILTERS, /eventLocation\.address/);
    assert.match(FILTERS, /eventLocation\.venue/);
  });

  test('extracts only plausible city labels and preserves raw filter values', () => {
    assert.match(FILTERS, /extractCityFromEventLocation/);
    assert.match(FILTERS, /isPlausibleCityName/);
    assert.match(FILTERS, /filterValues: Set<string>/);
    assert.match(FILTERS, /filterValues: Array\.from\(city\.filterValues\)/);
  });

  test('supports venue-first addresses and hybrid Moscow labels', () => {
    assert.match(SHARED_LOCATION, /function extractHybridCity/);
    assert.match(SHARED_LOCATION, /function extractCityFromValue/);
    assert.match(SHARED_LOCATION, /const REGION_PART =/);
    assert.match(SHARED_LOCATION, /const STREET_PREFIX =/);
    assert.match(SHARED_LOCATION, /const VENUE_MARKERS = \[/);
    assert.match(SHARED_LOCATION, /cityStem\(hybridCity\)/);
  });
});
