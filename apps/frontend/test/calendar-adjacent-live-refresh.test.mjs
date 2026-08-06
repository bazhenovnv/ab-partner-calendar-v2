import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const CALENDAR = readFileSync(
  join(ROOT, 'apps/frontend/src/components/events/EventCalendar.tsx'),
  'utf8',
);
const EVENTS = readFileSync(
  join(ROOT, 'apps/frontend/src/components/events/EventsSection.tsx'),
  'utf8',
);

describe('Calendar adjacent-month navigation and live event refresh', () => {
  test('opens dates from both previous and next months with one shared transition', () => {
    assert.match(CALENDAR, /const selectAdjacentMonthDate =/);
    assert.match(CALENDAR, /предыдущего месяца, открыть дату/);
    assert.match(CALENDAR, /следующего месяца, открыть дату/);
    assert.match(
      CALENDAR,
      /onClick=\{\(\) => selectAdjacentMonthDate\(previousYear, previousMonth, previousDay\)\}/,
    );
    assert.match(
      CALENDAR,
      /onClick=\{\(\) => selectAdjacentMonthDate\(nextYear, nextMonth, nextDay\)\}/,
    );
    assert.doesNotMatch(CALENDAR, /aria-disabled="true"/);
  });

  test('refreshes calendar markers every minute without showing a loading transition', () => {
    assert.match(CALENDAR, /const LIVE_REFRESH_INTERVAL_MS = 60_000/);
    assert.match(CALENDAR, /loadMarkers\(year, month, false\)/);
    assert.match(CALENDAR, /cache: 'no-store'/);
    assert.match(CALENDAR, /window\.setInterval/);
    assert.match(CALENDAR, /document\.visibilityState === 'visible'/);
  });

  test('refreshes visible event cards silently every minute and on return to the tab', () => {
    assert.match(EVENTS, /const LIVE_REFRESH_INTERVAL_MS = 60_000/);
    assert.match(EVENTS, /fetchEvents\(page, selectedDate, filters, false, true\)/);
    assert.match(EVENTS, /cache: 'no-store'/);
    assert.match(EVENTS, /window\.addEventListener\('focus', refreshVisibleEvents\)/);
    assert.match(EVENTS, /document\.addEventListener\('visibilitychange', refreshVisibleEvents\)/);
    assert.match(EVENTS, /if \(!silent\) setIsLoading\(false\)/);
  });
});
