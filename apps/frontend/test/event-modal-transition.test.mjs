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

describe('Staged composite event modal transition', () => {
  test('uses the complete modal surface instead of an independent image transition', () => {
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.doesNotMatch(transition, /startViewTransition/);
    assert.match(transition, /createOpeningAnimations/);
    assert.match(transition, /createClosingAnimations/);
    assert.match(transition, /elements\.surface\.animate|animateElement\(\s*elements\.surface/);
    assert.match(transition, /transformForRect/);
    assert.match(transition, /getIntermediateRect/);
  });

  test('keeps the deliberately slow staged timing', () => {
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(transition, /EVENT_MODAL_OPEN_DURATION_MS = 2800/);
    assert.match(transition, /EVENT_MODAL_CLOSE_DURATION_MS = 2400/);
    assert.match(transition, /EVENT_MODAL_CONTENT_REVEAL_START = 0\.38/);
    assert.match(transition, /EVENT_MODAL_CONTENT_REVEAL_END = 0\.68/);
  });

  test('opens in three visible stages', () => {
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(transition, /originTransform/);
    assert.match(transition, /intermediateTransform/);
    assert.match(transition, /offset: EVENT_MODAL_CONTENT_REVEAL_START/);
    assert.match(transition, /offset: EVENT_MODAL_CONTENT_REVEAL_END/);
    assert.match(transition, /overlayTranslateX/);
    assert.match(transition, /backgroundColor: 'rgba\(255, 255, 255, \.92\)'/);
    assert.match(transition, /clipPath: 'inset\(5% 5% 5% 5% round 24px\)'/);
    assert.match(transition, /transform: 'translateX\(0px\) scale\(1\)'/);
  });

  test('closes through the same stages in reverse', () => {
    const transition = readFileSync(TRANSITION, 'utf8');

    assert.match(transition, /destinationTransform/);
    assert.match(transition, /offset: 0\.34/);
    assert.match(transition, /offset: 0\.64/);
    assert.match(transition, /flushSync\(update\)/);
    assert.match(transition, /restoreOriginImage/);
    assert.match(transition, /dispatchModalState\(false\)/);
  });

  test('temporarily hides the source image and pauses the carousel', () => {
    const transition = readFileSync(TRANSITION, 'utf8');
    const carousel = readFileSync(CAROUSEL, 'utf8');

    assert.match(transition, /originImage\.style\.visibility = 'hidden'/);
    assert.match(transition, /originImage\.style\.visibility = originVisibility/);
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

  test('uses the existing modal DOM as the animated composite object', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /data-event-modal-backdrop/);
    assert.match(modal, /data-event-modal-surface/);
    assert.match(modal, /data-event-modal-image/);
    assert.match(modal, /closeEventWithTransition/);
    assert.match(modal, /restoreFocus/);
  });

  test('loads the motion stabilization layer after visual overrides', () => {
    const css = readFileSync(TRANSITION_CSS, 'utf8');
    const layout = readFileSync(LAYOUT, 'utf8');

    assert.match(css, /One staged composite animation/);
    assert.match(css, /data-event-composite-motion/);
    assert.match(css, /data-event-composite-part='content'/);
    assert.match(css, /prefers-reduced-motion: reduce/);

    assert.ok(
      layout.indexOf("homepage-controls-event-cards-final.css") <
        layout.indexOf("event-modal-transitions.css"),
      'Composite modal transition styles must load after homepage overrides',
    );
  });
});
