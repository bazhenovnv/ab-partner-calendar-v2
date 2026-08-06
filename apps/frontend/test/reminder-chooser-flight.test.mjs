import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const STYLES = readFileSync(
  resolve(FRONTEND, 'src/app/reminder-figma-final.css'),
  'utf8',
);

describe('Reminder chooser enlarged visible flight', () => {
  test('uses the enlarged 380 by 491 desktop geometry', () => {
    assert.match(STYLES, /width: min\(380px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /height: min\(491px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /padding: 38px 36px 62px 35px !important/);
    assert.match(STYLES, /width: 169px !important[\s\S]*height: 93px !important/);
    assert.match(STYLES, /height: 63px !important/);
    assert.match(STYLES, /width: 47px !important[\s\S]*height: 47px !important/);
  });

  test('uses a clearly visible button-origin entrance', () => {
    assert.match(STYLES, /@keyframes reminderChooserFlightInVisible/);
    assert.match(STYLES, /translate3d\([\s\S]*clamp\(120px, 16vw, 300px\)[\s\S]*clamp\(140px, 24vh, 260px\)/);
    assert.match(STYLES, /scale\(0\.44\)/);
    assert.match(STYLES, /filter: blur\(18px\)/);
    assert.match(STYLES, /animation: reminderChooserFlightInVisible 420ms cubic-bezier\(0\.16, 1, 0\.3, 1\) 30ms both !important/);
    assert.match(STYLES, /transform: translate3d\(-8px, -6px, 0\) scale\(1\.025\)/);
    assert.match(STYLES, /transform: translate3d\(0, 0, 0\) scale\(1\)/);
  });

  test('keeps safe responsive fallbacks', () => {
    assert.match(STYLES, /@media \(max-width: 460px\)/);
    assert.match(STYLES, /width: min\(300px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /height: min\(388px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /@media \(max-width: 360px\)/);
    assert.match(STYLES, /width: min\(240px, calc\(100% - 24px\)\) !important/);
    assert.match(STYLES, /height: min\(310px, calc\(100% - 24px\)\) !important/);
  });

  test('keeps a shorter but visible entrance for reduced-motion settings', () => {
    assert.match(STYLES, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(STYLES, /animation-duration: 120ms !important/);
    assert.match(STYLES, /animation-duration: 220ms !important/);
    assert.match(STYLES, /filter: none !important/);
  });
});
