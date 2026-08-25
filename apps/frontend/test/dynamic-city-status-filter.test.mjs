import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const FILTERS_UI = read('apps/frontend/src/components/events/EventFilters.tsx');
const FILTERS_CONTROLLER = read('apps/backend/src/modules/filters/filters.controller.ts');
const FILTERS_SERVICE = read('apps/backend/src/modules/filters/filters.service.ts');

describe('Dynamic city/status filter', () => {
  test('requests city options for the pending auto statuses before Apply', () => {
    assert.match(FILTERS_UI, /pending\.autoStatus\.forEach\(\(status\) => qs\.append\('autoStatus', status\)\)/);
    assert.match(FILTERS_UI, /fetch\(`\/api\/filters\/cities\?\$\{qs\.toString\(\)\}`/);
    assert.match(FILTERS_UI, /cities=\{statusCities\}/);
  });

  test('drops an already selected city when it is unavailable for the new status', () => {
    assert.match(FILTERS_UI, /nextSelectedCities = current\.cities\.filter/);
    assert.match(FILTERS_UI, /cities: nextSelectedCities/);
  });

  test('backend accepts repeated autoStatus values and filters published events', () => {
    assert.match(FILTERS_CONTROLLER, /@Query\('autoStatus'\)/);
    assert.match(FILTERS_SERVICE, /autoStatus: \{ in: autoStatus \}/);
    assert.match(FILTERS_SERVICE, /status: 'PUBLISHED'/);
  });
});
