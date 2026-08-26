import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const servicePath = resolve(
  import.meta.dirname,
  '../src/modules/reminders/reminders.service.ts',
);
const source = readFileSync(servicePath, 'utf8');

test('reminder creation validates against event startTime, not date midnight', () => {
  assert.ok(source.includes("import { getReminderEventDeadline } from '@ab-afisha/shared';"));
  assert.ok(source.includes('select: { id: true, startDate: true, startTime: true }'));
  assert.ok(source.includes('getReminderEventDeadline(event.startDate, event.startTime)'));
  assert.ok(source.includes('remindAt.getTime() >= eventDeadline.getTime()'));
  assert.ok(!source.includes('remindAt.getTime() >= event.startDate.getTime()'));
});

test('delivered reminder displays actual event start time', () => {
  assert.ok(source.includes('const eventMoment = getReminderEventDeadline(event.startDate, event.startTime) ?? event.startDate;'));
  assert.ok(source.includes('const eventDateMsk = formatMsk(eventMoment);'));
});
