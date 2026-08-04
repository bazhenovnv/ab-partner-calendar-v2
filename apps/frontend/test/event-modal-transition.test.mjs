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

describe('Reversible event modal transition', () => {
  test('uses one shared image element for opening and closing', () => {
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(transition, /EVENT_IMAGE_TRANSITION_NAME = 'event-modal-image'/);
    assert.match(transition, /startViewTransition/);
    assert.match(transition, /openEventWithTransition/);
    assert.match(transition, /closeEventWithTransition/);
    assert.match(transition, /setViewTransitionName\(source, EVENT_IMAGE_TRANSITION_NAME\)/);
    assert.match(transition, /clearViewTransitionName\(source\)/);
    assert.match(transition, /flushSync\(update\)/);
  });

  test('opens from regular cards and carousel images', () => {
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

  test('pauses carousel while modal origin must remain stable', () => {
    const carousel = readFileSync(CAROUSEL, 'utf8');

    assert.match(carousel, /EVENT_MODAL_STATE_EVENT/);
    assert.match(carousel, /isEventModalOpen/);
    assert.match(
      carousel,
      /isHovered \|\| isFocusWithin \|\| isPointerActive \|\| isEventModalOpen/,
    );
  });

  test('marks modal layers and restores focus after reverse movement', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /closeEventWithTransition/);
    assert.match(modal, /data-event-modal-backdrop/);
    assert.match(modal, /data-event-modal-surface/);
    assert.match(modal, /data-event-modal-image/);
    assert.match(modal, /EVENT_BACKDROP_TRANSITION_NAME/);
    assert.match(modal, /EVENT_SURFACE_TRANSITION_NAME/);
    assert.match(modal, /EVENT_IMAGE_TRANSITION_NAME/);
    assert.match(modal, /restoreFocus/);
  });

  test('animates blur in both directions and respects reduced motion', () => {
    const css = readFileSync(TRANSITION_CSS, 'utf8');
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(css, /data-event-modal-transition='opening'/);
    assert.match(css, /data-event-modal-transition='closing'/);
    assert.match(css, /eventImageOpeningNew/);
    assert.match(css, /eventImageClosingOld/);
    assert.match(css, /eventSurfaceIn/);
    assert.match(css, /eventSurfaceOut/);
    assert.match(css, /filter: blur\(22px\)/);
    assert.match(css, /filter: blur\(20px\)/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(transition, /prefers-reduced-motion: reduce/);
  });

  test('keeps the modal transition deliberately visible', () => {
    const css = readFileSync(TRANSITION_CSS, 'utf8');
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(transition, /EVENT_MODAL_OPEN_DURATION_MS = 1200/);
    assert.match(transition, /EVENT_MODAL_CLOSE_DURATION_MS = 950/);
    assert.match(transition, /EVENT_MODAL_SURFACE_DELAY_MS = 120/);
    assert.match(css, /animation-duration: 1200ms/);
    assert.match(css, /eventImageOpeningNew 1200ms/);
    assert.match(css, /eventImageClosingOld 950ms/);
    assert.match(css, /eventSurfaceIn 900ms[\s\S]*120ms both/);
    assert.match(css, /eventSurfaceOut 760ms/);
    assert.doesNotMatch(css, /eventImageOpeningNew 680ms/);
    assert.doesNotMatch(css, /eventImageClosingOld 520ms/);
  });

  test('loads the transition layer after all visual overrides', () => {
    const layout = readFileSync(LAYOUT, 'utf8');

    assert.ok(
      layout.indexOf("homepage-controls-event-cards-final.css") <
        layout.indexOf("event-modal-transitions.css"),
      'Event modal transitions must load after final homepage overrides',
    );
  });
});
