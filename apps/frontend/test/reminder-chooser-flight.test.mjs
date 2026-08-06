import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const STYLES = readFileSync(
  resolve(FRONTEND, 'src/app/reminder-figma-final.css'),
  'utf8',
);

describe('Reminder chooser enlarged button-origin flight', () => {
  test('uses the enlarged 300 by 388 desktop geometry', () => {
    assert.match(STYLES, /width: min\(300px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /height: min\(388px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /padding: 30px 28px 46px !important/);
    assert.match(STYLES, /width: 134px !important[\s\S]*height: 74px !important/);
    assert.match(STYLES, /width: 244px !important[\s\S]*height: 50px !important/);
    assert.match(STYLES, /width: 37\.3px !important[\s\S]*height: 37\.3px !important/);
  });

  test('flies from the reminder-button area while sharpening from blur', () => {
    assert.match(STYLES, /@keyframes reminderChooserFlightIn/);
    assert.match(STYLES, /translate3d\([\s\S]*clamp\(84px, 12vw, 220px\)[\s\S]*clamp\(96px, 18vh, 190px\)/);
    assert.match(STYLES, /scale\(0\.58\)/);
    assert.match(STYLES, /filter: blur\(12px\)/);
    assert.match(STYLES, /animation: reminderChooserFlightIn 220ms cubic-bezier\(0\.22, 1, 0\.36, 1\) 20ms forwards/);
    assert.match(STYLES, /filter: blur\(0\)/);
    assert.match(STYLES, /transform: translate3d\(0, 0, 0\) scale\(1\)/);
  });

  test('keeps the original compact layout on narrow screens', () => {
    assert.match(STYLES, /@media \(max-width: 360px\)/);
    assert.match(STYLES, /width: min\(240px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /height: min\(310px, calc\(100% - 24px\)\) !important/);
  });

  test('removes the motion for reduced-motion users', () => {
    assert.match(STYLES, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(STYLES, /animation: none !important/);
    assert.match(STYLES, /opacity: 1 !important/);
    assert.match(STYLES, /filter: none !important/);
    assert.match(STYLES, /transform: none !important/);
  });
});
