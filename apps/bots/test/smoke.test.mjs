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

describe('Reminder date selection', () => {
  test('Telegram uses multi-select date buttons and Apply', () => {
    const source = readFileSync(join(SRC, 'telegram/bot.ts'), 'utf8');
    assert.ok(source.includes('buildReminderDateOptions'));
    assert.ok(source.includes('reminder_toggle:'));
    assert.ok(source.includes("bot.callbackQuery('reminder_apply'"));
    assert.ok(source.includes('Применить'));
    assert.ok(!source.includes('awaitingReminderTime'));
    assert.ok(!source.includes('ДД.ММ.ГГГГ'));
  });

  test('MAX standalone process is disabled in webhook mode', () => {
    const source = readFileSync(join(SRC, 'max/bot.ts'), 'utf8');
    assert.ok(source.includes('Webhook mode enabled'));
    assert.ok(!source.includes('getUpdates'));
    assert.ok(!source.includes('api.max.ru/v1'));
  });
});
