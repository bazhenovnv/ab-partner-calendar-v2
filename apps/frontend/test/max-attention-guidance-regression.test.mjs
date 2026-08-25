import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(REPO_ROOT, path), 'utf8');

const parser = read('apps/backend/src/modules/max-import/max-parser.service.ts');
const baseParser = read('apps/backend/src/modules/max-import/max-parser-v2.service.ts');
const eventsService = read('apps/backend/src/modules/events/events.service.ts');
const schema = read('apps/backend/prisma/schema.prisma');
const queuePage = read('apps/frontend/src/app/admin/needs-attention/page.tsx');
const editPage = read('apps/frontend/src/app/admin/events/[id]/page.tsx');
const publicFormat = read('apps/frontend/src/lib/format.ts');

test('MAX venue-first location is repaired before publication', () => {
  assert.match(parser, /экспофорум/iu);
  assert.match(parser, /result\.city = cleanLocationPart\(result\.venue\)/);
  assert.match(parser, /result\.venue = venue/);
});

test('hybrid MAX events preserve manual review but normalize physical location', () => {
  assert.match(schema, /enum EventFormat[\s\S]*HYBRID/);
  assert.match(parser, /HYBRID_PATTERN/);
  assert.match(parser, /format: string \| null \}\)\.format = 'HYBRID'/);
  assert.match(baseParser, /Гибридный формат требует ручной проверки/);
  assert.match(parser, /const reasons = \[\.\.\.result\.attentionReasons\]/);
  assert.match(parser, /const whereValue = text\.match\(\/Где/);
  assert.match(parser, /Место очного участия гибридного события не определено/);
});

test('needs-attention queue explains reason and current publication blockers', () => {
  assert.match(eventsService, /private publicationIssues/);
  assert.match(eventsService, /images\?\.some/);
  assert.match(eventsService, /Для публикации нужно исправить/);
  assert.doesNotMatch(eventsService, /event\.images\?\.eventCardUrl/);
  assert.match(queuePage, /почему событие не опубликовано автоматически/);
  assert.match(queuePage, /Что нужно для публикации/);
  assert.match(queuePage, /Гибридный формат требует ручной проверки/);
});

test('reviewed attention events can be published and edited as hybrid', () => {
  assert.match(editPage, /event\.status === 'NEEDS_ATTENTION'/);
  assert.match(editPage, /Что мешает публикации сейчас/);
  assert.match(editPage, /<option value="HYBRID">Онлайн \+ офлайн<\/option>/);
  assert.match(editPage, /form\.format === 'OFFLINE' \|\| form\.format === 'HYBRID'/);
  assert.match(publicFormat, /format: 'ONLINE' \| 'OFFLINE' \| 'HYBRID'/);
  assert.match(publicFormat, /Онлайн \+ офлайн/);
});
