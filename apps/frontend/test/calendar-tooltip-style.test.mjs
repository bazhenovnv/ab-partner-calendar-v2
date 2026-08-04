import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const CALENDAR = join(FRONTEND, 'src/components/events/EventCalendar.tsx');
const STYLES = join(FRONTEND, 'src/app/stage70-calendar-navigation.css');

describe('Calendar date tooltip styling', () => {
  test('keeps the accessible tooltip rendered for each current-month day', () => {
    const calendar = readFileSync(CALENDAR, 'utf8');

    assert.match(calendar, /className="pub-calendar-tooltip"/);
    assert.match(calendar, /role="tooltip"/);
    assert.match(calendar, /aria-describedby=\{tooltipId\}/);
  });

  test('uses a 30-percent-transparent single-line surface with 12px text', () => {
    const styles = readFileSync(STYLES, 'utf8');

    assert.match(
      styles,
      /\.pub-calendar-tooltip\s*\{[\s\S]*background: rgba\(255, 255, 255, 0\.7\) !important/,
    );
    assert.match(
      styles,
      /\.pub-calendar-tooltip\s*\{[\s\S]*font-size: 12px !important/,
    );
    assert.match(
      styles,
      /\.pub-calendar-tooltip\s*\{[\s\S]*max-width: none !important/,
    );
    assert.match(
      styles,
      /\.pub-calendar-tooltip\s*\{[\s\S]*white-space: nowrap !important/,
    );
    assert.match(styles, /backdrop-filter: blur\(8px\)/);
    assert.match(
      styles,
      /\.pub-calendar-tooltip::after\s*\{[\s\S]*border-top-color: rgba\(255, 255, 255, 0\.7\) !important/,
    );
  });
});
