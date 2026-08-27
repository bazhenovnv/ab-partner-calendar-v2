import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(FRONTEND, '../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const MAX_PARSER = read(
  'apps/backend/src/modules/max-import/max-parser.service.ts',
);
const PUBLICATION_LOCATION = read(
  'apps/backend/src/modules/events/event-publication-location.service.ts',
);
const EVENTS_CONTROLLER = read(
  'apps/backend/src/modules/events/events.controller.ts',
);
const EVENTS_MODULE = read(
  'apps/backend/src/modules/events/events.module.ts',
);

describe('Canonical physical city publication', () => {
  test('MAX parser rejects non-city location values before auto-publication', () => {
    assert.match(MAX_PARSER, /extractCityFromEventLocation/);
    assert.match(MAX_PARSER, /isPlausibleCityName/);
    assert.match(MAX_PARSER, /validatePhysicalLocation/);
    assert.match(MAX_PARSER, /result\.city = null/);
    assert.match(
      MAX_PARSER,
      /Город очного участия не определён или требует проверки/,
    );
    assert.match(
      MAX_PARSER,
      /repairVenueFirstLocation\(result\);\s*validatePhysicalLocation\(result\);/,
    );
  });

  test('MAX parser deterministically prefers a separate Где line over a physical format token', () => {
    assert.match(MAX_PARSER, /PHYSICAL_FORMAT_PATTERN/);
    assert.match(MAX_PARSER, /Формат\\s\*:\\s\*\(\[\^\\n\]\+\)/);
    assert.match(MAX_PARSER, /Где\\s\*:\\s\*\(\[\^\\n\]\+\)/);
    assert.match(MAX_PARSER, /function applyPhysicalWhereValue\(whereValue: string, result: ParsedMaxPost\)/);
    assert.match(MAX_PARSER, /format: string \| null \}\)\.format = 'OFFLINE'/);
    assert.match(MAX_PARSER, /applyPhysicalWhereValue\(whereValue, result\)/);
    assert.doesNotMatch(MAX_PARSER, /whereParsed = super\.parse\(`Где: \$\{whereValue\}`/);
  });

  test('MAX parser preserves venue-first place and city as separate fields', () => {
    assert.match(MAX_PARSER, /VENUE_PREFIX\.test\(first\)/);
    assert.match(MAX_PARSER, /isPlausibleCityName\(second\)/);
    assert.match(MAX_PARSER, /result\.venue = first;\s*result\.city = second;/);
  });

  test('MAX parser recognizes hybrid format in both online/offline orders', () => {
    assert.match(
      MAX_PARSER,
      /\(\?:офлайн\|offline\|очно\)\\s\*\(\?:\\\+\|\\\/\)\\s\*\(\?:онлайн\|online\)/,
    );
    assert.match(
      MAX_PARSER,
      /\(\?:онлайн\|online\)\\s\*\(\?:\\\+\|\\\/\)\\s\*\(\?:офлайн\|offline\|очно\)/,
    );
  });

  test('manual publication requires an active canonical City relation', () => {
    assert.match(PUBLICATION_LOCATION, /event\.format !== 'OFFLINE'/);
    assert.match(PUBLICATION_LOCATION, /event\.format !== 'HYBRID'/);
    assert.match(PUBLICATION_LOCATION, /!event\.cityId/);
    assert.match(PUBLICATION_LOCATION, /!canonicalCity\.isActive/);
    assert.match(PUBLICATION_LOCATION, /!isPlausibleCityName\(canonicalCity\.name\)/);
    assert.match(PUBLICATION_LOCATION, /cityName: canonicalCity\.name/);
  });

  test('both publish endpoints enforce canonical physical city validation', () => {
    assert.match(
      EVENTS_CONTROLLER,
      /status === 'PUBLISHED'[\s\S]*?ensureCanonicalPhysicalCity\(id\)/,
    );
    assert.match(
      EVENTS_CONTROLLER,
      /async publishEvent[\s\S]*?ensureCanonicalPhysicalCity\(id\)[\s\S]*?eventsService\.publishEvent/,
    );
    assert.match(EVENTS_MODULE, /EventPublicationLocationService/);
  });
});
