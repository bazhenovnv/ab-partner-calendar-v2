import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const LOCATION = read('apps/backend/src/modules/events/event-publication-location.service.ts');
const CONTROLLER = read('apps/backend/src/modules/events/events.controller.ts');

describe('Canonical physical city publication guard', () => {
  test('keeps ONLINE events outside the physical-city guard', () => {
    assert.match(LOCATION, /event\.format !== 'OFFLINE' && event\.format !== 'HYBRID'/);
  });

  test('accepts only an active plausible canonical city when cityId is already linked', () => {
    assert.match(LOCATION, /event\.cityId/);
    assert.match(LOCATION, /canonicalCity\.isActive/);
    assert.match(LOCATION, /isPlausibleCityName\(canonicalCity\.name\)/);
  });

  test('auto-links legacy cityName only through one exact active catalogue match', () => {
    assert.match(LOCATION, /name:\s*\{\s*equals: legacyCityName,\s*mode: 'insensitive'/s);
    assert.match(LOCATION, /isActive: true/);
    assert.match(LOCATION, /take: 2/);
    assert.match(LOCATION, /if \(exactMatches\.length === 1\)/);
    assert.match(LOCATION, /cityId: matchedCity\.id/);
    assert.match(LOCATION, /cityName: matchedCity\.name/);
    assert.doesNotMatch(LOCATION, /contains: legacyCityName/);
    assert.doesNotMatch(LOCATION, /startsWith: legacyCityName/);
  });

  test('publish endpoint always invokes the canonical location guard first', () => {
    assert.match(
      CONTROLLER,
      /@Patch\('admin\/:id\/publish'\)[\s\S]*?await this\.publicationLocation\.ensureCanonicalPhysicalCity\(id\);[\s\S]*?return this\.eventsService\.publishEvent/,
    );
  });
});
