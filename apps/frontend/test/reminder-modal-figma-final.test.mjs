import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const REMINDER = join(FRONTEND, 'src/app/reminder-figma-final.css');
const FINAL_MODAL = join(FRONTEND, 'src/app/modal-close-spacing-scroll-final.css');
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');

const reminderStyles = readFileSync(REMINDER, 'utf8');
const finalModalStyles = readFileSync(FINAL_MODAL, 'utf8');
const layout = readFileSync(LAYOUT, 'utf8');

describe('Reminder chooser final Figma contract', () => {
  test('locks the chooser to the approved 240 × 310 desktop frame', () => {
    assert.match(reminderStyles, /width: 240px !important;/);
    assert.match(reminderStyles, /min-width: 240px !important;/);
    assert.match(reminderStyles, /max-width: 240px !important;/);
    assert.match(reminderStyles, /height: 310px !important;/);
    assert.match(reminderStyles, /min-height: 310px !important;/);
    assert.match(reminderStyles, /max-height: 310px !important;/);
    assert.match(reminderStyles, /overflow: hidden !important;/);
    assert.match(reminderStyles, /padding: 24px 23px 39px 22px !important;/);
  });

  test('preserves the measured illustration and platform-button geometry', () => {
    assert.match(
      reminderStyles,
      /event-modal-v2_chooserHeaderImage__[\s\S]*width: 107px !important;[\s\S]*height: 59px !important;/,
    );
    assert.match(
      reminderStyles,
      /event-modal-v2_platforms__[\s\S]*width: 195px !important;[\s\S]*gap: 12px !important;/,
    );
    assert.match(
      reminderStyles,
      /event-modal-v2_platform__[\s\S]*width: 195px !important;[\s\S]*height: 40px !important;/,
    );
    assert.match(
      reminderStyles,
      /event-modal-v2_cancel__[\s\S]*margin: 15px auto 0 !important;[\s\S]*font-size: 14px !important;/,
    );
  });

  test('uses a constrained responsive fallback only when 240 × 310 cannot fit', () => {
    assert.match(reminderStyles, /@media \(max-width: 263px\), \(max-height: 333px\)/);
    assert.match(
      reminderStyles,
      /height: min\(310px, calc\(100dvh - 24px\)\) !important;/,
    );
    assert.match(reminderStyles, /overflow-y: auto !important;/);
  });

  test('loads the exact Figma chooser before the last modal focus override', () => {
    const reminderIndex = layout.indexOf("./reminder-figma-final.css");
    const finalModalIndex = layout.indexOf("./modal-close-spacing-scroll-final.css");

    assert.ok(reminderIndex >= 0);
    assert.ok(finalModalIndex > reminderIndex);
    assert.match(finalModalStyles, /event-modal-v2_remind__"\]:focus-visible/);
    assert.match(finalModalStyles, /outline: 0 !important;/);
  });
});
