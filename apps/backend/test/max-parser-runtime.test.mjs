import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const { MaxParserService } = require('../dist/modules/max-import/max-parser.service.js');

const referenceDate = new Date('2026-08-27T12:00:00Z');

function parseLocation(format, where) {
  const parser = new MaxParserService();
  return parser.parse(
    [
      'Runtime parser regression',
      'Дата: 30 сентября 2026',
      `Формат: ${format}`,
      ...(where === null ? [] : [`Где: ${where}`]),
      '#налоги',
    ].join('\n'),
    referenceDate,
  );
}

describe('Compiled MAX structured physical location parser', () => {
  test('keeps Moscow from separate physical format and location lines', () => {
    const parsed = parseLocation('Очно', 'Москва');
    assert.equal(parsed.format, 'OFFLINE');
    assert.equal(parsed.city, 'Москва');
    assert.equal(parsed.venue, null);
    assert.equal(parsed.address, null);
    assert.equal(parsed.needsAttention, false);
  });

  test('normalizes venue-first ExpoForum and Saint Petersburg without duplicating city as venue', () => {
    const parsed = parseLocation('Очно', 'Экспофорум, Санкт-Петербург');
    assert.equal(parsed.format, 'OFFLINE');
    assert.equal(parsed.city, 'Санкт-Петербург');
    assert.equal(parsed.venue, 'Экспофорум');
    assert.notEqual(parsed.venue, parsed.city);
    assert.equal(parsed.address, null);
    assert.equal(parsed.needsAttention, false);
  });

  test('rejects non-city structured physical values', () => {
    for (const value of ['ст1', 'Очно', 'Экспофорум']) {
      const parsed = parseLocation('Очно', value);
      assert.equal(parsed.city, null, value);
      assert.equal(parsed.needsAttention, true, value);
      assert.ok(
        parsed.attentionReasons.includes(
          'Город очного участия не определён или требует проверки',
        ),
        value,
      );
    }
  });

  test('keeps hybrid without physical place in manual attention', () => {
    const parsed = parseLocation('офлайн + онлайн', null);
    assert.equal(parsed.format, 'HYBRID');
    assert.equal(parsed.city, null);
    assert.equal(parsed.needsAttention, true);
  });
});
