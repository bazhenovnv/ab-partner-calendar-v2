import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const FINAL_MODAL = join(FRONTEND, 'src/app/event-modal-transitions.css');
const FIGMA_MODAL = join(FRONTEND, 'src/app/event-modal-figma-final.css');
const MODAL_CONTENT = join(FRONTEND, 'src/lib/event-modal-content.ts');
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');

describe('Final modal Figma tuning', () => {
  test('expands the copy viewport while reducing title facts and controls proportionally', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      finalStyles,
      /event-modal-v2_scrollArea__[\s\S]*padding-top: clamp\(82px, 5\.625vw, 108px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_textScroll__[\s\S]*flex: 1 1 auto !important[\s\S]*overflow-y: auto !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_title__[\s\S]*font-size: clamp\(24px, 1\.875vw, 36px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_lead__[\s\S]*font-size: clamp\(13px, 0\.938vw, 18px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_facts__[\s\S]*height: clamp\(62px, 3\.75vw, 72px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_facts__[\s\S]*border-radius: 16\.38px !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_factIcon__[\s\S]*width: clamp\(34px, 2\.292vw, 44px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_primary__[\s\S]*height: clamp\(42px, 3\.021vw, 58px\) !important[\s\S]*font-size: clamp\(13px, 0\.833vw, 16px\) !important/,
    );
  });

  test('makes the structured format and speaker rows more readable', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      finalStyles,
      /event-modal-v2_lines__[\s\S]*font-size: clamp\(14px, 0\.938vw, 18px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_detailLabel__[\s\S]*font-weight: 700 !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_detailValue__[\s\S]*font-size: clamp\(13px, 0\.833vw, 16px\) !important/,
    );
  });

  test('removes microphone-prefixed speaker lists embedded in imported copy', () => {
    const modalContent = readFileSync(MODAL_CONTENT, 'utf8');

    assert.match(modalContent, /function removeInlineSpeakerFragments/);
    assert.match(modalContent, /🎙️\?\|🎤️\?/);
    assert.match(
      modalContent,
      /let result = removeInlineSpeakerFragments\(value\)/,
    );
    assert.match(
      modalContent,
      /result = removeInlineSpeakerFragments\(result\)/,
    );
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
