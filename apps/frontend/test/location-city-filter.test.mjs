import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const FILTERS = join(ROOT, 'apps/frontend/src/components/events/EventFilters.tsx');
const API = join(ROOT, 'apps/frontend/src/lib/api.ts');
const EVENT_TYPES = join(ROOT, 'apps/frontend/src/types/event.ts');

const filterSource = readFileSync(FILTERS, 'utf8');
const apiSource = readFileSync(API, 'utf8');
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

  test('uses approved city labels instead of parsing venue strings in the component', () => {
    assert.match(filterSource, /const name = city\.name\.trim\(\)/);
    assert.match(filterSource, /city\.filterValues \?\? \[\]/);
    assert.match(filterSource, /new Map<string, CityFilterOption>\(\)/);
    assert.match(filterSource, /name\.toLocaleLowerCase\('ru'\)/);
    assert.match(filterSource, /a\.name\.localeCompare\(b\.name, 'ru'\)/);
    assert.doesNotMatch(filterSource, /function getCityLabel/);
    assert.doesNotMatch(filterSource, /\.split\(','\)/);
  });

  test('keeps every canonical filter value behind one visible city option', () => {
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

  test('uses the synchronized city catalogue as the single public source', () => {
    assert.match(
      apiSource,
      /serverFetch<CityOption\[]>\('\/filters\/cities',\s*\{\s*cache:\s*'no-store'/,
    );
    assert.doesNotMatch(apiSource, /CITY_EVENT_PAGE_LIMIT/);
    assert.doesNotMatch(apiSource, /CITY_EVENT_STATUSES/);
    assert.doesNotMatch(apiSource, /fetchPublishedEventCityPage/);
    assert.doesNotMatch(apiSource, /buildPublishedEventCityOptions/);
  });

  test('filters catalogue rows down to canonical city names only', () => {
    assert.match(apiSource, /function isPublicCityName/);
    assert.match(apiSource, /splitLocationParts\(name\)\.length !== 1/);
    assert.match(apiSource, /\/\\d\/\.test\(name\)/);
    assert.match(apiSource, /NON_CITY_MARKERS\.some\(\(marker\) => normalized\.includes\(marker\)\)/);
  });

  test('uses the canonical city name as the backend filter value', () => {
    assert.match(apiSource, /filterValues:\s*\[name\]/);
    assert.match(apiSource, /new Map<string, CityOption>\(\)/);
    assert.match(apiSource, /normalizeLocationValue\(name\)/);
  });

  test('rejects non-city values and obvious venue or address rows', () => {
    assert.match(apiSource, /const NON_CITY_LOCATION_VALUES = new Set/);
    assert.match(apiSource, /'онлайн'/);
    assert.match(apiSource, /'очно'/);
    assert.match(apiSource, /'офлайн'/);
    for (const marker of ['отель', 'центр', 'переул', 'улиц', 'проспект']) {
      assert.match(apiSource, new RegExp(`'${marker}'`));
    }
  });

  test('keeps existing public event filtering and changes only city option sourcing', () => {
    assert.match(
      apiSource,
      /serverFetch<PublicEventsResponse>\(`\/events\/public\$\{query\}`, \{ cache: 'no-store' \}\)/,
    );
    assert.match(apiSource, /serverFetch<CityOption\[]>\('\/filters\/cities'/);
  });
});
