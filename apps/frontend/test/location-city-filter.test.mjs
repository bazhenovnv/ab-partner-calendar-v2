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
    assert.match(apiSource, /if \(event\.city\?\.name\)/);
    assert.match(apiSource, /const rawLocation = event\.cityName\?\.trim\(\) \?\? ''/);
    assert.match(apiSource, /return buildPublishedEventCityOptions\(events, catalogueCities\)/);
    assert.doesNotMatch(apiSource, /return serverFetch<CityOption\[]>\('\/filters\/cities'\)/);
  });

  test('maps venue text to a catalogue city and preserves its exact filter value', () => {
    assert.match(apiSource, /function splitLocationParts/);
    assert.match(apiSource, /function locationMatchesCity/);
    assert.match(apiSource, /catalogueCandidates\.find\(\(city\) =>/);
    assert.match(apiSource, /locationMatchesCity\(rawLocation, city\.name\)/);
    assert.match(apiSource, /filterValues: Set<string>/);
    assert.match(apiSource, /filterValues: Array\.from\(city\.filterValues\)/);
  });

  test('rejects non-city values and venue-only fallbacks', () => {
    assert.match(apiSource, /const NON_CITY_LOCATION_VALUES = new Set/);
    assert.match(apiSource, /'онлайн'/);
    assert.match(apiSource, /'очно'/);
    assert.match(apiSource, /'офлайн'/);
    assert.match(apiSource, /function looksLikeVenue/);
    assert.match(apiSource, /parts\.length !== 1 \|\| looksLikeVenue\(parts\[0\]\)/);
  });

  test('remains a frontend-only change and uses the existing backend endpoints', () => {
    assert.match(apiSource, /serverFetch<PublicEventsResponse>\(`\/events\/public\?\$\{qs\.toString\(\)\}`\)/);
    assert.match(apiSource, /serverFetch<CityOption\[]>\('\/filters\/cities'\)\.catch\(\(\) => \[\]\)/);
  });
});
