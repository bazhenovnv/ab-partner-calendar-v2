import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const TRANSITION = join(FRONTEND, 'src/lib/event-modal-transition.ts');
const TRANSITION_CSS = join(FRONTEND, 'src/app/event-modal-transitions.css');
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');
const EVENT_CARD = join(FRONTEND, 'src/components/events/EventCard.tsx');
const CAROUSEL = join(FRONTEND, 'src/components/events/MainEventsBanner.tsx');
const MODAL = join(FRONTEND, 'src/components/events/EventModalProvider.tsx');

describe('Sharp event image flight into a static modal', () => {
  test('moves the image between the exact rendered image rectangles without blur or scaling transforms', () => {
    const transition = readFileSync(TRANSITION, 'utf8');
    const flightStart = transition.indexOf('function imageRectKeyframe');
    const flightEnd = transition.indexOf('function createShellOpeningAnimations');
    const flight = transition.slice(flightStart, flightEnd);

    assert.ok(flightStart >= 0 && flightEnd > flightStart);
    assert.match(transition, /createImageFlightClone/);
    assert.match(transition, /animateImageFlight/);
    assert.match(flight, /top:/);
    assert.match(flight, /left:/);
    assert.match(flight, /width:/);
    assert.match(flight, /height:/);
    assert.doesNotMatch(flight, /filter|blur|transform|scale/);
    assert.doesNotMatch(transition, /startViewTransition/);
    assert.doesNotMatch(transition, /transformForRect|getIntermediateRect/);
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
    assert.match(
      transition,
      /startRect = copyRect\(elements\.image\.getBoundingClientRect\(\)\)/,
    );
    assert.doesNotMatch(
      transition,
      /(?:finalImageRect|startRect) = copyRect\(elements\.imageStage\.getBoundingClientRect\(\)\)/,
    );
  });

  test('uses mirrored image timing while the modal shell keeps its approved durations', () => {
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(transition, /EVENT_MODAL_OPEN_DURATION_MS = 600/);
    assert.match(transition, /EVENT_MODAL_CLOSE_DURATION_MS = 500/);
    assert.match(
      transition,
      /EVENT_MODAL_OPEN_IMAGE_DURATION_MS = EVENT_MODAL_CLOSE_DURATION_MS/,
    );
    assert.match(
      transition,
      /EVENT_MODAL_CLOSE_IMAGE_EASING = 'cubic-bezier\(0\.55, 0, 1, 0\.45\)'/,
    );
    assert.match(
      transition,
      /EVENT_MODAL_OPEN_IMAGE_EASING = 'cubic-bezier\(0, 0\.55, 0\.45, 1\)'/,
    );
    assert.doesNotMatch(transition, /EVENT_IMAGE_SPEED_MULTIPLIER/);
    assert.match(transition, /\{\s*duration,\s*easing,\s*fill: 'both'/);
    assert.match(transition, /EVENT_MODAL_CONTENT_REVEAL_START = 0\.28/);
    assert.match(transition, /EVENT_MODAL_CONTENT_REVEAL_END = 0\.88/);
  });

  test('keeps the modal at final size and reveals only non-image content from blur', () => {
    const transition = readFileSync(TRANSITION, 'utf8');
    const openingStart = transition.indexOf('function createShellOpeningAnimations');
    const openingEnd = transition.indexOf('function createShellClosingAnimations');
    const opening = transition.slice(openingStart, openingEnd);

    assert.ok(openingStart >= 0 && openingEnd > openingStart);
    assert.match(opening, /backgroundColor: 'rgba\(255, 255, 255, 0\)'/);
    assert.match(opening, /elements\.content/);
    assert.match(opening, /filter: 'blur\(26px\)'/);
    assert.match(opening, /filter: 'blur\(0px\)'/);
    assert.match(opening, /opacity: 0/);
    assert.match(opening, /opacity: 1/);
    assert.doesNotMatch(opening, /transform:/);
    assert.doesNotMatch(opening, /scale\(/);
  });

  test('closes by blurring the shell while the sharp image flies back', () => {
    const transition = readFileSync(TRANSITION, 'utf8');
    const closingStart = transition.indexOf('function createShellClosingAnimations');
    const closingEnd = transition.indexOf('function waitForAnimations');
    const closing = transition.slice(closingStart, closingEnd);

    assert.ok(closingStart >= 0 && closingEnd > closingStart);
    assert.match(closing, /elements\.content/);
    assert.match(closing, /filter: 'blur\(26px\)'/);
    assert.match(transition, /EVENT_MODAL_CLOSE_DURATION_MS/);
    assert.match(transition, /restoreOriginImage/);
    assert.match(transition, /dispatchModalState\(false\)/);
  });

  test('temporarily hides the original and in-modal images during the sharp flight', () => {
    const transition = readFileSync(TRANSITION, 'utf8');
    const css = readFileSync(TRANSITION_CSS, 'utf8');

    assert.match(transition, /originImage\.style\.visibility = 'hidden'/);
    assert.match(transition, /originImage\.style\.visibility = originVisibility/);
    assert.match(transition, /hideModalImage/);
    assert.match(css, /data-event-composite-part='image-stage'/);
    assert.match(css, /visibility: hidden/);
  });

  test('pauses the carousel while the source image must stay fixed', () => {
    const carousel = readFileSync(CAROUSEL, 'utf8');

    assert.match(carousel, /EVENT_MODAL_STATE_EVENT/);
    assert.match(carousel, /isEventModalOpen/);
    assert.match(
      carousel,
      /isHovered \|\| isFocusWithin \|\| isPointerActive \|\| isEventModalOpen/,
    );
  });

  test('opens from both regular cards and carousel images', () => {
    const card = readFileSync(EVENT_CARD, 'utf8');
    const carousel = readFileSync(CAROUSEL, 'utf8');

    assert.match(card, /querySelector<HTMLElement>\('img'\)/);
    assert.match(card, /openEventWithTransition\(sourceImage, \(\) => openEvent\(event\)\)/);
    assert.match(carousel, /querySelector<HTMLElement>\('img'\)/);
    assert.match(
      carousel,
      /openEventWithTransition\(sourceImage, \(\) => openEvent\(card\.event\)\)/,
    );
  });

  test('uses the existing modal DOM at its final geometry', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /data-event-modal-backdrop/);
    assert.match(modal, /data-event-modal-surface/);
    assert.match(modal, /data-event-modal-image/);
    assert.match(modal, /closeEventWithTransition/);
    assert.match(modal, /restoreFocus/);
  });

  test('loads the final transition layer after visual overrides', () => {
    const css = readFileSync(TRANSITION_CSS, 'utf8');
    const layout = readFileSync(LAYOUT, 'utf8');

    assert.match(css, /Sharp image flight/);
    assert.match(css, /data-event-composite-motion/);
    assert.match(css, /data-event-composite-part='content'/);
    assert.match(css, /prefers-reduced-motion: reduce/);

    assert.ok(
      layout.indexOf("homepage-controls-event-cards-final.css") <
        layout.indexOf("event-modal-transitions.css"),
      'Modal transition styles must load after homepage overrides',
    );
  });
});
