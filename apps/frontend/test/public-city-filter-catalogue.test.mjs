import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const API = readFileSync(resolve(ROOT, 'apps/frontend/src/lib/api.ts'), 'utf8');

describe('Public city filter catalogue', () => {
  test('uses the synchronized city catalogue directly and without stale cache', () => {
    assert.match(
      API,
      /serverFetch<CityOption\[]>\('\/filters\/cities',\s*\{\s*cache:\s*'no-store'/,
    );
    assert.doesNotMatch(API, /fetchAllPublishedEventsForCities/);
    assert.doesNotMatch(API, /CITY_EVENT_STATUSES/);
  });

  test('keeps obvious venue and address values out of the public city selector', () => {
    for (const marker of ['отель', 'центр', 'переул', 'пер.', 'улиц', 'проспект']) {
      assert.match(API, new RegExp(`'${marker.replace('.', '\\.')}'`));
    }
    assert.match(API, /if \(\/\\d\/\.test\(name\)\) return false/);
  });

  test('filters by canonical city name after cityId synchronization', () => {
    assert.match(API, /filterValues:\s*\[name\]/);
  });
});
