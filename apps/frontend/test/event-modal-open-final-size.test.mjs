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

test('event modal opens with the real image already at final geometry without the flight clone overshoot', () => {
  assert.match(
    css,
    /\[data-event-modal-surface\]\[data-event-composite-motion='opening'\][\s\S]*?\[data-event-composite-part='image-stage'\]\s*\{\s*visibility:\s*visible;/,
  );
  assert.match(
    css,
    /body:has\(\[data-event-modal-surface\]\[data-event-composite-motion='opening'\]\)[\s\S]*?> img\[aria-hidden='true'\]\[draggable='false'\]\s*\{\s*display:\s*none !important;/,
  );
  assert.match(
    css,
    /\[data-event-composite-part='image-stage'\]\s*\{\s*visibility:\s*hidden;/,
  );
  assert.match(transition, /markMotionElements\(elements, 'closing', true\)/);
  assert.match(transition, /animateImageFlight\([\s\S]*?'closing'/);
});
