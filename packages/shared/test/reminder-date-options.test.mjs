import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReminderDateOptions } from '../dist/index.js';

test('builds several future dates at 09:00 MSK before the event', () => {
  const options = buildReminderDateOptions(
    '2026-09-15T09:00:00.000Z',
    '2026-08-01T00:00:00.000Z',
  );

  assert.deepEqual(options.map((option) => option.id), [
    '2026-08-16',
    '2026-09-01',
    '2026-09-08',
    '2026-09-12',
    '2026-09-14',
    '2026-09-15',
  ]);
  assert.equal(options[0].remindAt, '2026-08-16T06:00:00.000Z');
  assert.match(options[0].label, /16 августа 2026/);
});

test('omits dates that have passed or are not before event start', () => {
  const options = buildReminderDateOptions(
    '2026-08-03T05:00:00.000Z',
    '2026-08-01T12:00:00.000Z',
  );

  assert.deepEqual(options.map((option) => option.id), ['2026-08-02']);
});
