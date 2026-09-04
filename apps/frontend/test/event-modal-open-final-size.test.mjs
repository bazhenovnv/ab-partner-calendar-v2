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

test('event modal opening is the pixel-stable reverse of the closing image flight', () => {
  assert.match(
    transition,
    /const EVENT_MODAL_OPEN_IMAGE_DURATION_MS = EVENT_MODAL_CLOSE_DURATION_MS;/,
  );
  assert.match(
    transition,
    /EVENT_MODAL_CLOSE_IMAGE_EASING = 'cubic-bezier\(0\.55, 0, 1, 0\.45\)'/,
  );
  assert.match(
    transition,
    /EVENT_MODAL_OPEN_IMAGE_EASING = 'cubic-bezier\(0, 0\.55, 0\.45, 1\)'/,
  );

  assert.match(
    transition,
    /const modalImage = getImageElement\(elements\.image\);/,
  );
  assert.match(
    transition,
    /finalImageRect = copyRect\(modalImage\.getBoundingClientRect\(\)\)/,
  );
  assert.match(
    transition,
    /createImageFlightClone\(\s*modalImage,\s*sourceRect,\s*sourceRadius,?\s*\)/,
  );
  assert.doesNotMatch(
    transition,
    /createImageFlightClone\(\s*originImageElement,\s*sourceRect,\s*sourceRadius,?\s*\)/,
  );
  assert.match(
    transition,
    /animateImageFlight\(\s*clone,\s*sourceRect,\s*finalImageRect,[\s\S]*?EVENT_MODAL_OPEN_IMAGE_DURATION_MS,\s*'opening'/,
  );
  assert.match(
    transition,
    /imageRectKeyframe\(\s*fromRect,[\s\S]*?0,\s*\),\s*imageRectKeyframe\(\s*toRect,[\s\S]*?1,\s*\),/,
  );
  assert.doesNotMatch(transition, /transformForRect|getIntermediateRect|scale\(/);

  assert.match(
    transition,
    /clearMotionElements\(elements\);[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?removeActiveClone\(\);/,
  );

  assert.match(
    css,
    /\[data-event-composite-part='image-stage'\]\s*\{\s*visibility:\s*hidden;/,
  );
  assert.match(
    css,
    /body:has\(\[data-event-modal-surface\]\[data-event-composite-motion='opening'\]\)[\s\S]*?> img\[aria-hidden='true'\]\[draggable='false'\]\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?box-shadow:\s*none !important;/,
  );

  assert.match(transition, /markMotionElements\(elements, 'closing', true\)/);
  assert.match(
    transition,
    /createImageFlightClone\(modalImage, startRect, startRadius\)/,
  );
  assert.match(transition, /animateImageFlight\([\s\S]*?'closing'/);
});
