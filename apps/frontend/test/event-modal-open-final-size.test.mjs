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

test('event modal opening mirrors closing geometry and hands card artwork off without a snap', () => {
  assert.match(transition, /EVENT_MODAL_OPEN_IMAGE_DURATION_MS = EVENT_MODAL_CLOSE_DURATION_MS/);
  assert.match(transition, /EVENT_MODAL_CLOSE_IMAGE_EASING = 'cubic-bezier\(0\.55, 0, 1, 0\.45\)'/);
  assert.match(transition, /EVENT_MODAL_OPEN_IMAGE_EASING = 'cubic-bezier\(0, 0\.55, 0\.45, 1\)'/);
  assert.match(transition, /EVENT_MODAL_OPEN_HANDOFF_DURATION_MS = 90/);
  assert.match(transition, /finalImageRect = copyRect\(modalImage\.getBoundingClientRect\(\)\)/);
  assert.match(transition, /createImageFlightClone\(\s*originImageElement,\s*sourceRect,\s*sourceRadius,?\s*\)/);
  assert.match(transition, /animateImageFlight\(\s*clone,\s*sourceRect,\s*finalImageRect,[\s\S]*?EVENT_MODAL_OPEN_IMAGE_DURATION_MS,\s*'opening'/);
  assert.doesNotMatch(transition, /transformForRect|getIntermediateRect|scale\(/);
  assert.match(transition, /clearMotionElements\(elements\);[\s\S]*?\{ opacity: 1, offset: 0 \}[\s\S]*?\{ opacity: 0, offset: 1 \}[\s\S]*?EVENT_MODAL_OPEN_HANDOFF_DURATION_MS/);
  assert.match(css, /\[data-event-composite-part='image-stage'\]\s*\{\s*visibility:\s*hidden;/);
  assert.match(css, /body:has\(\[data-event-modal-surface\]\[data-event-composite-motion='opening'\]\)[\s\S]*?box-shadow:\s*none !important;/);
  assert.match(transition, /markMotionElements\(elements, 'closing', true\)/);
  assert.match(transition, /createImageFlightClone\(modalImage, startRect, startRadius\)/);
});
