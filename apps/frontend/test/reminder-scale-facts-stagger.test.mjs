import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const REMINDER = join(FRONTEND, 'src/app/reminder-figma-final.css');
const FINAL_MODAL = join(FRONTEND, 'src/app/modal-close-spacing-scroll-final.css');
const RESULTS_GRID = join(FRONTEND, 'src/components/events/EventResultsGrid.tsx');
const RESULTS_STYLES = join(
  FRONTEND,
  'src/components/events/event-results-grid.module.css',
);

const reminderStyles = readFileSync(REMINDER, 'utf8');
const finalModalStyles = readFileSync(FINAL_MODAL, 'utf8');
const resultsGrid = readFileSync(RESULTS_GRID, 'utf8');
const resultsStyles = readFileSync(RESULTS_STYLES, 'utf8');

describe('Visible reminder size, facts typography and card stagger', () => {
  test('compensates the current 80-percent site scale for the desktop chooser', () => {
    assert.match(
      reminderStyles,
      /event-modal-v2_chooser__[\s\S]*width: min\(240px, calc\(100% - 24px\)\) !important;/,
    );
    assert.match(
      reminderStyles,
      /event-modal-v2_chooser__[\s\S]*height: 310px !important;/,
    );
    assert.match(reminderStyles, /transform: scale\(1\.25\) !important;/);
    assert.match(reminderStyles, /transform-origin: center !important;/);
  });

  test('does not force the desktop scale on small or short screens', () => {
    assert.match(
      reminderStyles,
      /@media \(max-width: 767px\), \(max-height: 500px\)[\s\S]*transform: none !important;/,
    );
    assert.match(
      reminderStyles,
      /@media \(max-width: 263px\), \(max-height: 333px\)[\s\S]*transform: none !important;/,
    );
  });

  test('increases only the date-time-price typography without resizing the panel', () => {
    assert.match(
      finalModalStyles,
      /event-modal-v2_label__[\s\S]*font-size: clamp\(10px, 0\.625vw, 12px\) !important;/,
    );
    assert.match(
      finalModalStyles,
      /event-modal-v2_value__[\s\S]*font-size: clamp\(12px, 0\.781vw, 15px\) !important;/,
    );
    assert.doesNotMatch(
      finalModalStyles,
      /Increase only the facts typography[\s\S]*event-modal-v2_facts__[\s\S]*(?:width|height|padding|margin):/,
    );
  });

  test('reveals event cards one-by-one every 100 milliseconds', () => {
    assert.match(resultsGrid, /const CARD_REVEAL_STEP_MS = 100;/);
    assert.match(
      resultsGrid,
      /'--event-card-delay': `\$\{index \* CARD_REVEAL_STEP_MS\}ms`/,
    );
    assert.match(resultsGrid, /data-event-card-reveal/);
    assert.match(
      resultsStyles,
      /animation: eventCardReveal 320ms cubic-bezier\(0\.22, 1, 0\.36, 1\) both;/,
    );
    assert.match(
      resultsStyles,
      /animation-delay: var\(--event-card-delay, 0ms\);/,
    );
  });

  test('starts scrolling in the same frame as the first card reveal', () => {
    assert.match(resultsGrid, /window\.requestAnimationFrame\(\(\) => \{/);
    assert.match(resultsGrid, /window\.cancelAnimationFrame\(frame\)/);
    assert.doesNotMatch(resultsGrid, /lastCardDelay|scrollDelay|setTimeout/);
  });

  test('keeps the accessibility fallback for reduced motion', () => {
    assert.match(resultsStyles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(
      resultsStyles,
      /cardReveal[\s\S]*opacity: 1;[\s\S]*animation: none;[\s\S]*transform: none;/,
    );
  });
});
