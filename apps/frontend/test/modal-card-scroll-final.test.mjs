import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const FINAL_MODAL = join(
  FRONTEND,
  'src/app/modal-close-spacing-scroll-final.css',
);
const CARD_INTERACTIONS = join(
  FRONTEND,
  'src/components/events/event-interactions.module.css',
);
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');

describe('Final modal, card title and page-load contracts', () => {
  test('keeps every modal close control free of background tiles', () => {
    const styles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      styles,
      /button\[aria-label="Закрыть"\],[\s\S]*button\[aria-label="Закрыть"\]:hover,[\s\S]*button\[aria-label="Закрыть"\]:focus-visible,[\s\S]*button\[aria-label="Закрыть"\]:active/,
    );
    assert.match(styles, /background: transparent !important;/);
    assert.match(styles, /background-color: transparent !important;/);
    assert.match(styles, /border-color: transparent !important;/);
    assert.match(styles, /box-shadow: none !important;/);
    assert.match(styles, /filter: none !important;/);
  });

  test('moves title copy farther below the status while preserving metadata placement', () => {
    const styles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      styles,
      /@media \(min-width: 768px\)[\s\S]*event-modal-v2_scrollArea__[\s\S]*padding-top: calc\(clamp\(96px, 6\.4vw, 123px\) \+ 12px\) !important;/,
    );
    assert.match(
      styles,
      /event-modal-v2_scrollArea__[\s\S]*padding-bottom: calc\(clamp\(58px, 3\.542vw, 68px\) \+ 10px\) !important;/,
    );
  });

  test('enlarges and visually normalizes the three fact icons only on desktop', () => {
    const styles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      styles,
      /event-modal-v2_fact__[\s\S]*grid-template-columns: clamp\(35px, 2\.396vw, 46px\) minmax\(0, 1fr\) !important;/,
    );
    assert.match(
      styles,
      /event-modal-v2_factIconWrap__[\s\S]*width: clamp\(35px, 2\.396vw, 46px\) !important;[\s\S]*height: clamp\(35px, 2\.396vw, 46px\) !important;/,
    );
    assert.match(
      styles,
      /event-modal-v2_factIcon_calendar__[\s\S]*event-modal-v2_factIcon__[\s\S]*transform: scale\(1\.12\) !important;/,
    );
    assert.match(
      styles,
      /event-modal-v2_factIcon_clock__[\s\S]*event-modal-v2_factIcon__[\s\S]*transform: scale\(1\) !important;/,
    );
    assert.match(
      styles,
      /event-modal-v2_factIcon_price__[\s\S]*event-modal-v2_factIcon__[\s\S]*transform: scale\(1\.22\) !important;/,
    );
  });

  test('enlarges every label and value in location and speaker rows', () => {
    const styles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      styles,
      /event-modal-v2_lines__[\s\S]*event-modal-v2_detailValue__[\s\S]*font-size: clamp\(15px, 0\.99vw, 19px\) !important;/,
    );
  });

  test('shows a third card-title line without moving card elements', () => {
    const styles = readFileSync(CARD_INTERACTIONS, 'utf8');
    const titleBlock = styles.match(/\.cardTitle \{[\s\S]*?\}/)?.[0] ?? '';

    assert.match(titleBlock, /-webkit-line-clamp: 3;/);
    assert.doesNotMatch(
      titleBlock,
      /(?:^|\s)(?:position|top|right|bottom|left|margin|padding|height|transform)\s*:/,
    );
  });

  test('resets full-page loads to the document top before app content', () => {
    const layout = readFileSync(LAYOUT, 'utf8');
    const resetScriptIndex = layout.indexOf('reset-scroll-on-full-page-load');
    const childrenIndex = layout.indexOf('{children}');

    assert.ok(resetScriptIndex >= 0);
    assert.ok(resetScriptIndex < childrenIndex);
    assert.match(layout, /window\.history\.scrollRestoration = 'manual'/);
    assert.match(layout, /window\.scrollTo\(0, 0\)/);
    assert.match(layout, /window\.addEventListener\('pageshow', resetScroll/);
    assert.match(layout, /window\.addEventListener\('load'/);
  });

  test('loads the final modal override after every older modal layer', () => {
    const layout = readFileSync(LAYOUT, 'utf8');
    const transitionsIndex = layout.indexOf("./event-modal-transitions.css");
    const finalIndex = layout.indexOf("./modal-close-spacing-scroll-final.css");

    assert.ok(transitionsIndex >= 0);
    assert.ok(finalIndex > transitionsIndex);
  });
});
