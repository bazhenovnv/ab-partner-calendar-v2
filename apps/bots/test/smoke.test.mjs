/**
 * Bots smoke tests — structural checks.
 * Uses Node.js built-in test runner (node:test), zero extra dependencies.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const BOTS = resolve(import.meta.dirname, '..');
const SRC = join(BOTS, 'src');

describe('Bot files exist', () => {
  const files = [
    'index.ts',
    'telegram/bot.ts',
    'max/bot.ts',
  ];

  for (const f of files) {
    test(`src/${f}`, () => {
      assert.ok(existsSync(join(SRC, f)), `Missing: apps/bots/src/${f}`);
    });
  }
});

describe('Reminder calendar and time selection', () => {
  test('Telegram uses compact calendar, time controls and Apply', () => {
    const source = readFileSync(join(SRC, 'telegram/bot.ts'), 'utf8');
    assert.ok(source.includes('buildReminderCalendar'));
    assert.ok(source.includes('buildReminderDateTime'));
    assert.ok(source.includes('reminder_month:'));
    assert.ok(source.includes('reminder_date:'));
    assert.ok(source.includes('reminder_time:'));
    assert.ok(source.includes("bot.callbackQuery('reminder_add'"));
    assert.ok(source.includes("bot.callbackQuery('reminder_apply'"));
    assert.ok(source.includes('Применить'));
    assert.ok(!source.includes('awaitingReminderTime'));
    assert.ok(!source.includes('reminder_toggle:'));
  });

  test('MAX standalone process is disabled in webhook mode', () => {
    const source = readFileSync(join(SRC, 'max/bot.ts'), 'utf8');
    assert.ok(source.includes('Webhook mode enabled'));
    assert.ok(!source.includes('getUpdates'));
    assert.ok(!source.includes('api.max.ru/v1'));
  });
});
