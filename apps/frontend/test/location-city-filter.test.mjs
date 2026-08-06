import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const FILTERS = join(ROOT, 'apps/frontend/src/components/events/EventFilters.tsx');
const API = join(ROOT, 'apps/frontend/src/lib/api.ts');
const EVENT_TYPES = join(ROOT, 'apps/frontend/src/types/event.ts');
const SHARED_LOCATION = join(ROOT, 'packages/shared/src/location-city.ts');

const filterSource = readFileSync(FILTERS, 'utf8');
const apiSource = readFileSync(API, 'utf8');
const eventTypesSource = readFileSync(EVENT_TYPES, 'utf8');
const sharedLocationSource = readFileSync(SHARED_LOCATION, 'utf8');

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

  test('uses the shared location parser for city, address and venue fields', () => {
    assert.match(apiSource, /extractCityFromEventLocation/);
    assert.match(apiSource, /isPlausibleCityName/);
    assert.match(apiSource, /normalizeLocationValue/);
    assert.match(apiSource, /const rawValues = \[event\.cityName, event\.address, event\.venue\]/);
    assert.match(apiSource, /address: event\.address/);
    assert.match(apiSource, /venue: event\.venue/);
    assert.doesNotMatch(apiSource, /function getCityLabel/);
  });

  test('keeps raw event location values behind one visible city option', () => {
    assert.match(eventTypesSource, /filterValues\?: string\[\]/);
    assert.match(apiSource, /filterValues: Set<string>/);
    assert.match(apiSource, /values\.forEach\(\(value\) => existing\.filterValues\.add\(value\)\)/);
    assert.match(apiSource, /filterValues: Array\.from\(city\.filterValues\)/);
    assert.match(filterSource, /\[name, \.\.\.\(city\.filterValues \?\? \[\]\)\]/);
    assert.match(filterSource, /new Set\(city\.values\)/);
    assert.match(filterSource, /\.\.\.selectedCities, \.\.\.city\.values/);
  });

  test('blocks format, venue, street and region values from visible cities', () => {
    assert.match(sharedLocationSource, /const NON_CITY_VALUES = new Set/);
    assert.match(sharedLocationSource, /const VENUE_MARKERS = \[/);
    assert.match(sharedLocationSource, /const STREET_PREFIX =/);
    assert.match(sharedLocationSource, /const REGION_PART =/);
    assert.match(sharedLocationSource, /isPlausibleCityName/);
    assert.match(sharedLocationSource, /FORMAT_WORDS\.test\(normalized\)/);
  });

  test('extracts a city from hybrid labels and venue-first addresses', () => {
    assert.match(sharedLocationSource, /function extractHybridCity/);
    assert.match(sharedLocationSource, /(?:очно\|офлайн\|offline)/);
    assert.match(sharedLocationSource, /function extractCityFromValue/);
    assert.match(sharedLocationSource, /for \(let index = parts\.length - 1; index >= 0; index -= 1\)/);
    assert.match(sharedLocationSource, /findCatalogueCity/);
    assert.match(sharedLocationSource, /cityStem\(hybridCity\)/);
  });

  test('clears obsolete region selections when a city changes', () => {
    assert.match(
      filterSource,
      /onChange=\{\(selectedCities\) => \{[\s\S]*regions: \[\],[\s\S]*cities: selectedCities/,
    );
    assert.match(filterSource, /selectedCities=\{pending\.cities\}/);
    assert.doesNotMatch(filterSource, /selectedRegions=\{pending\.regions\}/);
  });

  test('collects every published event page through the existing public API', () => {
    assert.match(apiSource, /const CITY_EVENT_PAGE_LIMIT = 50/);
    assert.match(apiSource, /const CITY_EVENT_STATUSES = \['PLANNED', 'LIVE', 'COMPLETED'\]/);
    assert.match(apiSource, /CITY_EVENT_STATUSES\.forEach\(\(status\) => qs\.append\('autoStatus', status\)\)/);
    assert.match(apiSource, /fetchPublishedEventCityPage\(1\)/);
    assert.match(apiSource, /Math\.ceil\(firstPage\.total \/ CITY_EVENT_PAGE_LIMIT\)/);
    assert.match(apiSource, /fetchPublishedEventCityPage\(index \+ 2\)/);
    assert.match(apiSource, /flatMap\(\(page\) => page\.events\)/);
  });

  test('derives visible options only from published event cards', () => {
    assert.match(apiSource, /function buildPublishedEventCityOptions/);
    assert.match(apiSource, /for \(const event of events\)/);
    assert.match(apiSource, /if \(event\.city\?\.name && isPlausibleCityName\(event\.city\.name\)\)/);
    assert.match(apiSource, /extractCityFromEventLocation/);
    assert.match(apiSource, /return buildPublishedEventCityOptions\(events, catalogueCities\)/);
    assert.doesNotMatch(apiSource, /return serverFetch<CityOption\[]>\('\/filters\/cities'\)/);
  });
});
