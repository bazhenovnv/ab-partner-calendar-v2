import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const BACKEND_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(BACKEND_ROOT, '../..');

const parserCompat = readFileSync(
  resolve(BACKEND_ROOT, 'src/modules/max-import/max-parser.service.ts'),
  'utf8',
);
const eventsService = readFileSync(
  resolve(BACKEND_ROOT, 'src/modules/events/events.service.ts'),
  'utf8',
);
const schema = readFileSync(
  resolve(BACKEND_ROOT, 'prisma/schema.prisma'),
  'utf8',
);
const needsAttentionPage = readFileSync(
  resolve(REPO_ROOT, 'apps/frontend/src/app/admin/needs-attention/page.tsx'),
  'utf8',
);
const eventEditPage = readFileSync(
  resolve(REPO_ROOT, 'apps/frontend/src/app/admin/events/[id]/page.tsx'),
  'utf8',
);

describe('MAX attention guidance regressions', () => {
  test('supports hybrid events in the data model', () => {
    assert.match(schema, /enum EventFormat[\s\S]*HYBRID/);
    assert.match(schema, /attentionReasons\s+String\[\]/);
  });

  test('repairs venue-first MAX locations such as ExpoForum, Saint Petersburg', () => {
    const fixture = 'Где: Экспофорум, Санкт-Петербург';
    assert.match(fixture, /Экспофорум, Санкт-Петербург/);
    assert.match(parserCompat, /экспофорум/iu);
    assert.match(parserCompat, /result\.city = cleanLocationPart\(result\.venue\)/);
    assert.match(parserCompat, /result\.venue = venue/);
  });

  test('normalizes online plus offline MAX posts as hybrid and parses Where separately', () => {
    const fixture = [
      'Формат: онлайн + офлайн',
      'Где: Москва, ул. Петровка, д. 15, стр. 1, 2-й этаж, Малый конференц-зал',
    ].join('\n');
    assert.match(fixture, /онлайн \+ офлайн/);
    assert.match(parserCompat, /HYBRID_PATTERN/);
    assert.match(parserCompat, /format: string \| null \}\)\.format = 'HYBRID'/);
    assert.match(parserCompat, /text\.match\(\/Где\\s\*:\\s\*\(\[\^\\n\]\+\)\/i\)/);
    assert.match(parserCompat, /Место очного участия гибридного события не определено/);
  });

  test('calculates actionable publication blockers and checks image arrays correctly', () => {
    assert.match(eventsService, /private publicationIssues/);
    assert.match(eventsService, /images\?\.some/);
    assert.match(eventsService, /Не определён город очного участия/);
    assert.match(eventsService, /Изображение события отсутствует/);
    assert.match(eventsService, /Для публикации нужно исправить/);
    assert.doesNotMatch(eventsService, /event\.images\?\.eventCardUrl/);
  });

  test('shows the cause and required administrator action in needs-attention UI', () => {
    assert.match(needsAttentionPage, /Почему событие не опубликовано автоматически/);
    assert.match(needsAttentionPage, /Причина/);
    assert.match(needsAttentionPage, /Что нужно для публикации/);
    assert.match(needsAttentionPage, /Обязательные данные заполнены/);
  });

  test('allows reviewed needs-attention events to be published after validation', () => {
    assert.match(eventEditPage, /event\.status === 'NEEDS_ATTENTION'/);
    assert.match(eventEditPage, /Что мешает публикации сейчас/);
    assert.match(eventEditPage, /<option value="HYBRID">Онлайн \+ офлайн<\/option>/);
    assert.match(eventEditPage, /form\.format === 'OFFLINE' \|\| form\.format === 'HYBRID'/);
  });
});
