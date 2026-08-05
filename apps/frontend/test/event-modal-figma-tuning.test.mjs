import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const FINAL_MODAL = join(FRONTEND, 'src/app/event-modal-transitions.css');
const FIGMA_MODAL = join(FRONTEND, 'src/app/event-modal-figma-final.css');
const MODAL = join(FRONTEND, 'src/components/events/EventModalProvider.tsx');
const MODAL_CONTENT = join(FRONTEND, 'src/lib/event-modal-content.ts');
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');

describe('Final modal Figma tuning', () => {
  test('uses one artwork inset for the status top and action bottom edges', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /data-event-modal-status/);
    assert.match(modal, /data-event-modal-action-bar/);
    assert.match(modal, /data-event-modal-actions/);
    assert.match(
      finalStyles,
      /--event-modal-image-inset-y: clamp\(40px, 3\.68vw, 71px\)/,
    );
    assert.match(
      finalStyles,
      /\[data-event-modal-status\][\s\S]*top: var\(--event-modal-image-inset-y\) !important/,
    );
    assert.match(
      finalStyles,
      /\[data-event-modal-action-bar\][\s\S]*padding-bottom: var\(--event-modal-image-inset-y\) !important/,
    );
  });

  test('expands the copy viewport and resets it to the beginning', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(
      finalStyles,
      /event-modal-v2_scrollArea__[\s\S]*padding-top: clamp\(96px, 6\.4vw, 123px\) !important/,
    );
    assert.match(
      finalStyles,
      /\[data-event-modal-copy-scroll\][\s\S]*flex: 1 1 auto !important[\s\S]*overflow-y: auto !important[\s\S]*scrollbar-gutter: auto !important/,
    );
    assert.match(modal, /textScrollRef\.current\?\.scrollTo\(\{ top: 0, left: 0 \}\)/);
  });

  test('uses visibly smaller title copy facts and action controls', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      finalStyles,
      /event-modal-v2_title__[\s\S]*font-size: clamp\(23px, 1\.771vw, 34px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_lead__[\s\S]*font-size: clamp\(13px, 0\.885vw, 17px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_facts__[\s\S]*height: clamp\(58px, 3\.542vw, 68px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_factIcon__[\s\S]*width: clamp\(32px, 2\.188vw, 42px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_primary__[\s\S]*width: clamp\(132px, 9\.896vw, 190px\) !important[\s\S]*height: clamp\(40px, 2\.708vw, 52px\) !important[\s\S]*font-size: clamp\(13px, 0\.781vw, 15px\) !important/,
    );
  });

  test('keeps format and complete speaker rows readable', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(
      finalStyles,
      /event-modal-v2_lines__[\s\S]*font-size: clamp\(14px, 0\.885vw, 17px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_detailLabel__[\s\S]*font-weight: 700 !important/,
    );
    assert.match(modal, /speakers\.length > 1 \? 'Спикеры:' : 'Спикер:'/);
    assert.match(modal, /speakers\.join\(', '\)/);
  });

  test('removes every imported speaker tail including numeric microphone entities', () => {
    const modalContent = readFileSync(MODAL_CONTENT, 'utf8');

    assert.match(modalContent, /export function getEventModalSpeakers/);
    assert.match(modalContent, /function removeInlineSpeakerFragments/);
    assert.match(modalContent, /&#x\(\[0-9a-f\]\+\)/);
    assert.match(modalContent, /&#\(\\d\+\)/);
    assert.match(modalContent, /inner\.search\(markerPattern\)/);
    assert.match(modalContent, /escapeHtml\(editorialPrefix\)/);
  });

  test('rounds every status badge while preserving the approved status palette', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');
    const figmaStyles = readFileSync(FIGMA_MODAL, 'utf8');

    assert.match(
      finalStyles,
      /@media \(min-width: 768px\)[\s\S]*event-modal-v2_status__[\s\S]*border-radius: 6px !important/,
    );
    assert.match(
      finalStyles,
      /@media \(max-width: 767px\)[\s\S]*event-modal-v2_status__[\s\S]*border-radius: 5px !important/,
    );
    assert.match(figmaStyles, /event-modal-v2_statusLive__[\s\S]*#ffdb99/);
    assert.match(figmaStyles, /event-modal-v2_statusPlanned__[\s\S]*#7cd8b3/);
    assert.match(figmaStyles, /event-modal-v2_statusCompleted__[\s\S]*#a3a3a3/);
  });

  test('loads final tuning after legacy Figma measurements', () => {
    const layout = readFileSync(LAYOUT, 'utf8');

    assert.ok(
      layout.indexOf("event-modal-figma-final.css") <
        layout.indexOf("event-modal-transitions.css"),
      'Final modal tuning must load after the legacy Figma layer',
    );
  });
});
