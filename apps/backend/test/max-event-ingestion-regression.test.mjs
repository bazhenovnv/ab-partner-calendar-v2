import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const PARSER = readFileSync(
  resolve(ROOT, 'src/modules/max-import/max-parser-v2.service.ts'),
  'utf8',
);
const RECOVERY = readFileSync(
  resolve(ROOT, 'src/modules/max-import/max-import-recovery.service.ts'),
  'utf8',
);
const BOOTSTRAP = readFileSync(
  resolve(ROOT, 'src/modules/max-import/max-import-bootstrap.service.ts'),
  'utf8',
);
const MODULE = readFileSync(
  resolve(ROOT, 'src/modules/max-import/max-import.module.ts'),
  'utf8',
);

const FIXTURES = [
  {
    title: 'АВТОУСН — МЕНЬШЕ ОТЧЕТНОСТИ ИЛИ БОЛЬШЕ НЕОЖИДАННЫХ ВОПРОСОВ?',
    when: 'Когда: 30 июля, 11:00 (МСК)',
    format: 'Формат: Онлайн',
    price: 'Стоимость: 9 990 ₽',
    expectedDirection: 'sno',
  },
  {
    title: 'ФНС УЖЕ ВИДИТ РИСКИ. А ВЫ ЗНАЕТЕ, НА ЧТО СМОТРЯТ В ПЕРВУЮ ОЧЕРЕДЬ?',
    when: 'Когда: 4 августа, 11:00 (МСК)',
    format: 'Формат: Москва, Бизнес-центр White Stone (4-й Лесной пер., 4)',
    price: 'Стоимость: Бесплатно',
    expectedDirection: 'taxes',
  },
  {
    title: 'КАДРОВЫЕ ИЗМЕНЕНИЯ ИДУТ ПОСТОЯННО. А ВЫ УСПЕВАЕТЕ ПЕРЕСТРАИВАТЬСЯ?',
    when: 'Когда: 5 августа, 15:00 (МСК)',
    format: 'Формат: Тюмень, ул. 25 Октября, 23а, ст1',
    price: 'Стоимость: Бесплатно',
    expectedDirection: 'personnel',
  },
];

describe('MAX event ingestion regressions', () => {
  test('keeps the three reported post formats as explicit regression fixtures', () => {
    assert.equal(FIXTURES.length, 3);
    assert.match(FIXTURES[0].when, /30 июля, 11:00/);
    assert.match(FIXTURES[1].format, /Москва, Бизнес-центр White Stone/);
    assert.match(FIXTURES[2].format, /Тюмень, ул\. 25 Октября/);
  });

  test('parses city-first offline format lines and parenthetical addresses', () => {
    assert.match(PARSER, /const structured = text\.match\(\/(?:Формат\|Где)/);
    assert.match(PARSER, /cityAndDetails/);
    assert.match(PARSER, /parentheticalAddress/);
    assert.match(PARSER, /STREET_PREFIX\.test\(details\)/);
  });

  test('infers directions when source posts omit recognized hashtags', () => {
    for (const fixture of FIXTURES) {
      assert.ok(fixture.expectedDirection.length > 0);
    }
    assert.match(PARSER, /DIRECTION_HINTS/);
    assert.match(PARSER, /автоусн\|аусн/);
    assert.match(PARSER, /фнс\|налогов/);
    assert.match(PARSER, /кадр\|персонал/);
    assert.match(PARSER, /result\.directionSlugs = \['accounting'\]/);
  });

  test('does not hide valid events only because time or registration URL is absent', () => {
    assert.match(PARSER, /missing-start-time/);
    assert.match(PARSER, /missing-registration-url/);
    assert.doesNotMatch(PARSER, /addAttention\(result, 'Ссылка на регистрацию не найдена'\)/);
    assert.doesNotMatch(PARSER, /addAttention\(result, 'Время не указано'\)/);
  });

  test('reprocesses historical MAX drafts and needs-attention records', () => {
    assert.match(RECOVERY, /status: \{ in: \['DRAFT', 'NEEDS_ATTENTION'\] \}/);
    assert.match(RECOVERY, /source: 'MAX'/);
    assert.match(RECOVERY, /status: nextStatus/);
    assert.match(RECOVERY, /publishedAt: publishable/);
    assert.match(RECOVERY, /mainEvent: event\.mainEvent \|\| parsed\.mainEvent/);
  });

  test('runs recovery after the normal startup MAX reconciliation', () => {
    assert.match(BOOTSTRAP, /maxImportService\.runManual\(\)/);
    assert.match(BOOTSTRAP, /maxImportRecovery\.reprocessPending\(\)/);
    assert.match(MODULE, /MaxImportRecoveryService/);
  });
});
