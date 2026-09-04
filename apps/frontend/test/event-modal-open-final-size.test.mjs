import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const css = readFileSync(
  resolve(root, 'apps/frontend/src/app/event-modal-transitions.css'),
  'utf8',
);
const transition = readFileSync(
  resolve(root, 'apps/frontend/src/lib/event-modal-transition.ts'),
  'utf8',
);

test('event modal image flies from the source rect to the exact final modal rect without a visual overshoot', () => {
  assert.match(
    transition,
    /finalImageRect = copyRect\(elements\.image\.getBoundingClientRect\(\)\)/,
  );
  assert.match(
    transition,
    /animateImageFlight\(\s*clone,\s*sourceRect,\s*finalImageRect,/,
  );
  assert.match(
    transition,
    /imageRectKeyframe\(\s*fromRect,[\s\S]*?0,\s*\),\s*imageRectKeyframe\(\s*toRect,[\s\S]*?1,\s*\),/,
  );
  assert.doesNotMatch(transition, /transformForRect|getIntermediateRect|scale\(/);

  assert.match(
    css,
    /\[data-event-composite-part='image-stage'\]\s*\{\s*visibility:\s*hidden;/,
  );
  assert.doesNotMatch(
    css,
    /\[data-event-modal-surface\]\[data-event-composite-motion='opening'\][\s\S]*?\[data-event-composite-part='image-stage'\]\s*\{\s*visibility:\s*visible;/,
  );
  assert.match(
    css,
    /body:has\(\[data-event-modal-surface\]\[data-event-composite-motion='opening'\]\)[\s\S]*?> img\[aria-hidden='true'\]\[draggable='false'\]\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?box-shadow:\s*none !important;/,
  );
  assert.doesNotMatch(
    css,
    /body:has\(\[data-event-modal-surface\]\[data-event-composite-motion='opening'\]\)[\s\S]*?> img\[aria-hidden='true'\]\[draggable='false'\]\s*\{[\s\S]*?display:\s*none !important;/,
  );

  assert.match(transition, /markMotionElements\(elements, 'closing', true\)/);
  assert.match(transition, /animateImageFlight\([\s\S]*?'closing'/);
});
