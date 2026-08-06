import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const FILTERS = join(ROOT, 'apps/frontend/src/components/events/EventFilters.tsx');
const FILTERS_SERVICE = join(ROOT, 'apps/backend/src/modules/filters/filters.service.ts');

const filterSource = readFileSync(FILTERS, 'utf8');
const filtersServiceSource = readFileSync(FILTERS_SERVICE, 'utf8');

describe('City-only public location filter', () => {
  test('renders one flat city list without regions, groups or counters', () => {
    assert.match(filterSource, /const availableCities = useMemo/);
    assert.match(filterSource, /availableCities\.map\(\(city\) =>/);
    assert.match(filterSource, /aria-label="Выберите города"/);
    assert.match(filterSource, /<span>Все<\/span>/);
    assert.match(filterSource, /<span>\{city\.name\}<\/span>/);

    assert.doesNotMatch(filterSource, /groupedCities/);
    assert.doesNotMatch(filterSource, /toggleRegion/);
    assert.doesNotMatch(filterSource, /pub-filter-location-region/);
    assert.doesNotMatch(filterSource, /pub-filter-location-group/);
    assert.doesNotMatch(filterSource, /eventCount|cityCount|regionCount/);
  });

  test('deduplicates and alphabetically sorts city names', () => {
    assert.match(filterSource, /new Map<string, CityOption>\(\)/);
    assert.match(filterSource, /name\.toLocaleLowerCase\('ru'\)/);
    assert.match(filterSource, /a\.name\.localeCompare\(b\.name, 'ru'\)/);
    assert.match(filterSource, /name\.toLocaleLowerCase\('ru'\) === 'онлайн'/);
  });

  test('clears obsolete region selections when a city changes', () => {
    assert.match(
      filterSource,
      /onChange=\{\(selectedCities\) => \{[\s\S]*regions: \[\],[\s\S]*cities: selectedCities/,
    );
    assert.match(filterSource, /selectedCities=\{pending\.cities\}/);
    assert.doesNotMatch(filterSource, /selectedRegions=\{pending\.regions\}/);
  });

  test('backend city options cover every published event location source', () => {
    assert.match(filtersServiceSource, /status: 'PUBLISHED'/);
    assert.match(filtersServiceSource, /\{ cityId: \{ not: null \} \}/);
    assert.match(filtersServiceSource, /\{ cityName: \{ not: null \} \}/);
    assert.match(filtersServiceSource, /eventLocation\.city/);
    assert.match(filtersServiceSource, /eventLocation\.cityName\?\.trim\(\)/);
    assert.match(filtersServiceSource, /normalizedName === 'онлайн'/);
  });
});
