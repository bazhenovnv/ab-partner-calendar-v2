import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adjustReminderTime,
  buildReminderCalendar,
  buildReminderDateTime,
  formatReminderDateLabel,
  getAvailableReminderHours,
  getAvailableReminderMinutes,
  getInitialReminderMonth,
  getReminderEventDeadline,
  shiftReminderMonth,
} from '../dist/index.js';

test('builds a compact Monday-first calendar between today and event date', () => {
  const calendar = buildReminderCalendar(
    '2026-09-15T09:00:00.000Z',
    '2026-08',
    '2026-08-03T06:00:00.000Z',
  );

  assert.ok(calendar);
  assert.equal(calendar.monthId, '2026-08');
  assert.match(calendar.label, /Август 2026/);
  assert.equal(calendar.canGoPrevious, false);
  assert.equal(calendar.canGoNext, true);
  assert.equal(calendar.weeks[0][0].dateId, null);

  const enabled = calendar.weeks.flat().filter((day) => day.enabled);
  assert.equal(enabled[0].dateId, '2026-08-03');
  assert.equal(enabled.at(-1).dateId, '2026-08-31');
});

test('clamps calendar month navigation to today and event month', () => {
  assert.equal(
    getInitialReminderMonth('2026-09-15T09:00:00.000Z', '2026-08-03T06:00:00.000Z'),
    '2026-08',
  );
  assert.equal(
    shiftReminderMonth('2026-08', 1, '2026-09-15T09:00:00.000Z', '2026-08-03T06:00:00.000Z'),
    '2026-09',
  );
  assert.equal(
    shiftReminderMonth('2026-09', 1, '2026-09-15T09:00:00.000Z', '2026-08-03T06:00:00.000Z'),
    '2026-09',
  );
});

test('creates a Moscow date-time reminder with user-selected time', () => {
  const option = buildReminderDateTime(
    '2026-08-10',
    '14:15',
    '2026-08-20T00:00:00.000Z',
    '18:00',
    '2026-08-03T06:00:00.000Z',
  );

  assert.ok(option);
  assert.equal(option.id, '2026-08-10T14:15');
  assert.equal(option.remindAt, '2026-08-10T11:15:00.000Z');
  assert.match(option.label, /10 августа 2026/);
  assert.match(option.label, /14:15/);
});

test('uses the separate event startTime as the reminder deadline', () => {
  const deadline = getReminderEventDeadline(
    '2026-08-20T00:00:00.000Z',
    '18:30',
  );

  assert.ok(deadline);
  assert.equal(deadline.toISOString(), '2026-08-20T15:30:00.000Z');
});

test('offers only five-minute slots that are still valid before event start', () => {
  const now = '2026-08-03T06:32:00.000Z'; // 09:32 MSK
  const eventDate = '2026-08-03T00:00:00.000Z';
  const eventTime = '12:12';

  assert.deepEqual(
    getAvailableReminderHours('2026-08-03', eventDate, eventTime, now),
    ['09', '10', '11', '12'],
  );
  assert.deepEqual(
    getAvailableReminderMinutes('2026-08-03', '09', eventDate, eventTime, now),
    ['35', '40', '45', '50', '55'],
  );
  assert.deepEqual(
    getAvailableReminderMinutes('2026-08-03', '12', eventDate, eventTime, now),
    ['00', '05', '10'],
  );
});

test('formats the selected calendar date for bot screens', () => {
  assert.match(formatReminderDateLabel('2026-08-27') ?? '', /27 августа 2026/);
  assert.equal(formatReminderDateLabel('bad-date'), null);
});

test('rejects past reminders and reminders at or after event start', () => {
  assert.equal(
    buildReminderDateTime(
      '2026-08-03',
      '08:00',
      '2026-08-03T00:00:00.000Z',
      '12:00',
      '2026-08-03T06:00:00.000Z',
    ),
    null,
  );
  assert.equal(
    buildReminderDateTime(
      '2026-08-03',
      '12:00',
      '2026-08-03T00:00:00.000Z',
      '12:00',
      '2026-08-03T06:00:00.000Z',
    ),
    null,
  );
});

test('keeps legacy time adjustment helper backward compatible', () => {
  assert.equal(adjustReminderTime('09:00', 15), '09:15');
  assert.equal(adjustReminderTime('09:00', -60), '08:00');
  assert.equal(adjustReminderTime('00:00', -15), '23:45');
});
