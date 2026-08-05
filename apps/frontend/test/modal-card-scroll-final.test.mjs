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

  test('raises facts and format rows by one facts-panel height', () => {
    const styles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      styles,
      /@media \(min-width: 768px\)[\s\S]*event-modal-v2_scrollArea__[\s\S]*padding-bottom: calc\(clamp\(58px, 3\.542vw, 68px\) \+ 10px\) !important;/,
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
