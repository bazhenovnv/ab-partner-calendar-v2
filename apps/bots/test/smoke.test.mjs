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
const REPO = resolve(BOTS, '../..');
const MAX_INTERACTION = join(
  REPO,
  'apps/backend/src/modules/max-import/max-bot-interaction.service.ts',
);

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
  test('Telegram uses date -> hour -> minute multi-select flow', () => {
    const source = readFileSync(join(SRC, 'telegram/bot.ts'), 'utf8');
    assert.ok(source.includes('buildReminderCalendar'));
    assert.ok(source.includes('buildReminderDateTime'));
    assert.ok(source.includes('getAvailableReminderHours'));
    assert.ok(source.includes('getAvailableReminderMinutes'));
    assert.ok(source.includes('reminder_month:'));
    assert.ok(source.includes('reminder_date:'));
    assert.ok(source.includes('reminder_hour:'));
    assert.ok(source.includes('reminder_minute:'));
    assert.ok(source.includes('reminder_selected'));
    assert.ok(source.includes('reminder_remove:'));
    assert.ok(source.includes('reminder_cancel'));
    assert.ok(source.includes("bot.callbackQuery('reminder_apply'"));
    assert.ok(source.includes('selectedTimesForHour'));
    assert.ok(source.includes('Уже выбрано в этом часу:'));
    assert.ok(source.includes('Применить'));
    assert.ok(source.includes('Очистить'));
    assert.ok(source.includes('Отмена'));
    assert.ok(!source.includes('pendingTime:'));
    assert.ok(!source.includes('reminder_time:'));
    assert.ok(!source.includes("bot.callbackQuery('reminder_add'"));
    assert.ok(!source.includes('reminder_toggle:'));

    const minuteStart = source.indexOf('bot.callbackQuery(/^reminder_minute:');
    const minuteEnd = source.indexOf("bot.callbackQuery('reminder_hours_back'");
    assert.ok(minuteStart >= 0 && minuteEnd > minuteStart);
    const minuteHandler = source.slice(minuteStart, minuteEnd);
    assert.ok(minuteHandler.includes("state.view = 'minute'"));
    assert.ok(!minuteHandler.includes('state.pendingHour = undefined'));
  });

  test('MAX webhook uses the same multi-select flow and Accept button', () => {
    const source = readFileSync(MAX_INTERACTION, 'utf8');
    assert.ok(source.includes('getAvailableReminderHours'));
    assert.ok(source.includes('getAvailableReminderMinutes'));
    assert.ok(source.includes('reminder_hour:'));
    assert.ok(source.includes('reminder_minute:'));
    assert.ok(source.includes('reminder_selected'));
    assert.ok(source.includes('reminder_remove:'));
    assert.ok(source.includes('reminder_cancel'));
    assert.ok(source.includes('selectedTimesForHour'));
    assert.ok(source.includes('Уже выбрано в этом часу:'));
    assert.ok(source.includes("this.button('Принять', 'accept_legal')"));
    assert.ok(source.includes('Применить'));
    assert.ok(source.includes('Очистить'));
    assert.ok(source.includes('Отмена'));
    assert.ok(!source.includes('pendingTime:'));
    assert.ok(!source.includes('reminder_time:'));
    assert.ok(!source.includes("payload === 'reminder_add'"));

    const minuteStart = source.indexOf('const minuteMatch = /^reminder_minute:');
    const minuteEnd = source.indexOf("if (payload === 'reminder_hours_back')");
    assert.ok(minuteStart >= 0 && minuteEnd > minuteStart);
    const minuteHandler = source.slice(minuteStart, minuteEnd);
    assert.ok(minuteHandler.includes("state.view = 'minute'"));
    assert.ok(!minuteHandler.includes('state.pendingHour = undefined'));
  });

  test('MAX standalone process is disabled in webhook mode', () => {
    const source = readFileSync(join(SRC, 'max/bot.ts'), 'utf8');
    assert.ok(source.includes('Webhook mode enabled'));
    assert.ok(!source.includes('getUpdates'));
    assert.ok(!source.includes('api.max.ru/v1'));
  });
});
