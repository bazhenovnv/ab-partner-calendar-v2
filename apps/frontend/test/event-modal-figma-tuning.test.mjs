import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const FINAL_MODAL = join(FRONTEND, 'src/app/event-modal-transitions.css');
const FIGMA_MODAL = join(FRONTEND, 'src/app/event-modal-figma-final.css');
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');

describe('Final modal Figma tuning', () => {
  test('uses the approved 40px desktop title and compact 655 by 78 facts panel', () => {
    const finalStyles = readFileSync(FINAL_MODAL, 'utf8');

    assert.match(
      finalStyles,
      /event-modal-v2_title__[\s\S]*font-size: clamp\(26px, 2\.083vw, 40px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_facts__[\s\S]*height: clamp\(68px, 4\.063vw, 78px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_facts__[\s\S]*border-radius: 16\.38px !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_factIcon__[\s\S]*width: clamp\(38px, 2\.604vw, 50px\) !important/,
    );
    assert.match(
      finalStyles,
      /event-modal-v2_factIcon__[\s\S]*height: clamp\(38px, 2\.604vw, 50px\) !important/,
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
