import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const FILTERS_UI = read('apps/frontend/src/components/events/EventFilters.tsx');
const FILTERS_CONTROLLER = read('apps/backend/src/modules/filters/filters.controller.ts');
const FILTERS_SERVICE = read('apps/backend/src/modules/filters/filters.service.ts');

describe('Faceted city/status filter', () => {
  test('requests both city and status facets from the pending filter state', () => {
    assert.match(FILTERS_UI, /fetch\(`\/api\/filters\/facets\?\$\{qs\.toString\(\)\}`/);
    assert.match(FILTERS_UI, /pending\.cities\.forEach/);
    assert.match(FILTERS_UI, /pending\.autoStatus\.forEach/);
    assert.match(FILTERS_UI, /pending\.directions\.forEach/);
  });

  test('drops incompatible city and status selections without self-filtering', () => {
    assert.match(FILTERS_UI, /selectedCities = current\.cities\.filter/);
    assert.match(FILTERS_UI, /selectedStatuses = current\.autoStatus\.filter/);
    assert.match(FILTERS_UI, /setAvailableStatuses/);
    assert.match(FILTERS_UI, /По выбранным фильтрам городов нет/);
  });

  test('backend calculates city and status facets independently', () => {
    assert.match(FILTERS_CONTROLLER, /@Get\('facets'\)/);
    assert.match(FILTERS_SERVICE, /const cityWhere/);
    assert.match(FILTERS_SERVICE, /const statusWhere/);
    assert.match(FILTERS_SERVICE, /autoStatus: \{ in: query\.autoStatus \}/);
    assert.match(FILTERS_SERVICE, /this\.cityConstraint\(query\.cities\)/);
    assert.match(FILTERS_SERVICE, /status: 'PUBLISHED'/);
  });
});
