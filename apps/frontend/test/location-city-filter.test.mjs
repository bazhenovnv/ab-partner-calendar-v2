import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const FILTERS = join(ROOT, 'apps/frontend/src/components/events/EventFilters.tsx');
const FILTERS_SERVICE = join(ROOT, 'apps/backend/src/modules/filters/filters.service.ts');
const EVENT_TYPES = join(ROOT, 'apps/frontend/src/types/event.ts');

const filterSource = readFileSync(FILTERS, 'utf8');
const filtersServiceSource = readFileSync(FILTERS_SERVICE, 'utf8');
const eventTypesSource = readFileSync(EVENT_TYPES, 'utf8');

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

  test('uses backend-approved city labels instead of parsing venue strings', () => {
    assert.match(filterSource, /const name = city\.name\.trim\(\)/);
    assert.match(filterSource, /city\.filterValues \?\? \[\]/);
    assert.match(filterSource, /new Map<string, CityFilterOption>\(\)/);
    assert.match(filterSource, /name\.toLocaleLowerCase\('ru'\)/);
    assert.match(filterSource, /a\.name\.localeCompare\(b\.name, 'ru'\)/);
    assert.doesNotMatch(filterSource, /function getCityLabel/);
    assert.doesNotMatch(filterSource, /\.split\(','\)/);
  });

  test('keeps every raw card location behind one visible city option', () => {
    assert.match(eventTypesSource, /filterValues\?: string\[\]/);
    assert.match(filterSource, /\[name, \.\.\.\(city\.filterValues \?\? \[\]\)\]/);
    assert.match(filterSource, /\.\.\.existingCity\.values, \.\.\.values/);
    assert.match(filterSource, /new Set\(city\.values\)/);
    assert.match(filterSource, /\.\.\.selectedCities, \.\.\.city\.values/);
    assert.match(filterSource, /selectedLabels\.join\(', '\)/);
  });

  test('blocks format and delivery labels from the city menu', () => {
    assert.match(filterSource, /const NON_CITY_VALUES = new Set/);
    assert.match(filterSource, /'онлайн'/);
    assert.match(filterSource, /'очно'/);
    assert.match(filterSource, /'офлайн'/);
    assert.match(filterSource, /NON_CITY_VALUES\.has\(normalizedName\)/);
  });

  test('clears obsolete region selections when a city changes', () => {
    assert.match(
      filterSource,
      /onChange=\{\(selectedCities\) => \{[\s\S]*regions: \[\],[\s\S]*cities: selectedCities/,
    );
    assert.match(filterSource, /selectedCities=\{pending\.cities\}/);
    assert.doesNotMatch(filterSource, /selectedRegions=\{pending\.regions\}/);
  });

  test('backend derives options only from published event-card locations', () => {
    assert.match(filtersServiceSource, /status: 'PUBLISHED'/);
    assert.match(filtersServiceSource, /\{ cityId: \{ not: null \} \}/);
    assert.match(filtersServiceSource, /\{ cityName: \{ not: null \} \}/);
    assert.match(filtersServiceSource, /const usedCities = new Map<string, UsedCity>\(\)/);
    assert.match(filtersServiceSource, /eventLocation\.city/);
    assert.match(filtersServiceSource, /eventLocation\.cityName\?\.trim\(\)/);
    assert.doesNotMatch(filtersServiceSource, /new Map\(\s*catalogueCities\.map/);
  });

  test('backend maps venue text to catalogue cities and preserves exact filter values', () => {
    assert.match(filtersServiceSource, /function splitLocationParts/);
    assert.match(filtersServiceSource, /function locationMatchesCity/);
    assert.match(filtersServiceSource, /catalogueBySpecificity\.find/);
    assert.match(filtersServiceSource, /locationMatchesCity\(rawLocation, city\.name\)/);
    assert.match(filtersServiceSource, /filterValues: Set<string>/);
    assert.match(filtersServiceSource, /filterValues: Array\.from\(city\.filterValues\)/);
  });

  test('backend rejects non-city values and venue-only fallbacks', () => {
    assert.match(filtersServiceSource, /const NON_CITY_LOCATION_VALUES = new Set/);
    assert.match(filtersServiceSource, /'онлайн'/);
    assert.match(filtersServiceSource, /'очно'/);
    assert.match(filtersServiceSource, /'офлайн'/);
    assert.match(filtersServiceSource, /function looksLikeVenue/);
    assert.match(filtersServiceSource, /parts\.length !== 1 \|\| looksLikeVenue\(parts\[0\]\)/);
  });
});
