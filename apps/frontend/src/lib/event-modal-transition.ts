'use client';

import { flushSync } from 'react-dom';

export const EVENT_IMAGE_TRANSITION_NAME = 'event-modal-image';
export const EVENT_SURFACE_TRANSITION_NAME = 'event-modal-surface';
export const EVENT_BACKDROP_TRANSITION_NAME = 'event-modal-backdrop';

export const EVENT_MODAL_STATE_EVENT = 'ab:event-modal-state';

interface BrowserViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

interface ViewTransitionDocument extends Document {
  startViewTransition?: (
    callback: () => void | Promise<void>,
  ) => BrowserViewTransition;
}

type TransitionDirection = 'opening' | 'closing';

let originImage: HTMLElement | null = null;
let activeTransition: BrowserViewTransition | null = null;
let transitionSequence = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setViewTransitionName(element: HTMLElement | null, value: string): void {
  if (!element) return;
  element.style.setProperty('view-transition-name', value);
}

function clearViewTransitionName(element: HTMLElement | null): void {
  if (!element) return;
  element.style.removeProperty('view-transition-name');
}

function dispatchModalState(open: boolean): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_MODAL_STATE_EVENT, {
      detail: { open },
    }),
  );
}

function beginTransition(direction: TransitionDirection): number {
  const sequence = ++transitionSequence;
  document.documentElement.dataset.eventModalTransition = direction;
  return sequence;
}

function finishTransition(sequence: number): void {
  if (sequence !== transitionSequence) return;
  delete document.documentElement.dataset.eventModalTransition;
  activeTransition = null;
}

function getConnectedOrigin(): HTMLElement | null {
  if (!originImage?.isConnected) return null;
  return originImage;
}

function animateFallbackOpening(): void {
  window.requestAnimationFrame(() => {
    const backdrop = document.querySelector<HTMLElement>('[data-event-modal-backdrop]');
    const surface = document.querySelector<HTMLElement>('[data-event-modal-surface]');
    const image = document.querySelector<HTMLElement>('[data-event-modal-image]');

    backdrop?.animate(
      [
        { opacity: 0, backdropFilter: 'blur(0px)' },
        { opacity: 1, backdropFilter: 'blur(10px)' },
      ],
      { duration: 360, easing: 'ease-out' },
    );

    surface?.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(24px) scale(0.9)',
          filter: 'blur(16px)',
        },
        {
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0px)',
        },
      ],
      {
        duration: 520,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );

    image?.animate(
      [
        { opacity: 0.25, transform: 'scale(0.82)', filter: 'blur(18px)' },
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
      ],
      {
        duration: 560,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );
  });
}

async function animateFallbackClosing(): Promise<void> {
  const backdrop = document.querySelector<HTMLElement>('[data-event-modal-backdrop]');
  const surface = document.querySelector<HTMLElement>('[data-event-modal-surface]');
  const image = document.querySelector<HTMLElement>('[data-event-modal-image]');

  const animations = [
    backdrop?.animate(
      [
        { opacity: 1, backdropFilter: 'blur(10px)' },
        { opacity: 0, backdropFilter: 'blur(0px)' },
      ],
      { duration: 320, easing: 'ease-in', fill: 'forwards' },
    ),
    surface?.animate(
      [
        {
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0px)',
        },
        {
          opacity: 0,
          transform: 'translateY(18px) scale(0.92)',
          filter: 'blur(14px)',
        },
      ],
      {
        duration: 360,
        easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        fill: 'forwards',
      },
    ),
    image?.animate(
      [
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
        { opacity: 0.2, transform: 'scale(0.84)', filter: 'blur(18px)' },
      ],
      {
        duration: 360,
        easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        fill: 'forwards',
      },
    ),
  ].filter((animation): animation is Animation => Boolean(animation));

  await Promise.allSettled(animations.map((animation) => animation.finished));
}

export function openEventWithTransition(
  imageElement: HTMLElement | null,
  update: () => void,
): void {
  activeTransition?.skipTransition();
  activeTransition = null;

  originImage = imageElement?.isConnected ? imageElement : null;
  dispatchModalState(true);

  const documentWithTransition = document as ViewTransitionDocument;
  const startViewTransition = documentWithTransition.startViewTransition?.bind(
    documentWithTransition,
  );

  if (!startViewTransition || prefersReducedMotion()) {
    flushSync(update);
    if (!prefersReducedMotion()) animateFallbackOpening();
    return;
  }

  const source = getConnectedOrigin();
  const sequence = beginTransition('opening');
  setViewTransitionName(source, EVENT_IMAGE_TRANSITION_NAME);

  const transition = startViewTransition(() => {
    clearViewTransitionName(source);
    flushSync(update);
  });

  activeTransition = transition;
  void transition.finished.finally(() => {
    if (sequence !== transitionSequence) return;
    clearViewTransitionName(source);
    finishTransition(sequence);
  });
}

export function closeEventWithTransition(
  update: () => void,
  afterClose?: () => void,
): void {
  activeTransition?.skipTransition();
  activeTransition = null;

  const source = getConnectedOrigin();
  const documentWithTransition = document as ViewTransitionDocument;
  const startViewTransition = documentWithTransition.startViewTransition?.bind(
    documentWithTransition,
  );

  const finalize = () => {
    dispatchModalState(false);
    originImage = null;
    afterClose?.();
  };

  if (!startViewTransition || prefersReducedMotion()) {
    if (prefersReducedMotion()) {
      flushSync(update);
      finalize();
      return;
    }

    void animateFallbackClosing().finally(() => {
      flushSync(update);
      finalize();
    });
    return;
  }

  const sequence = beginTransition('closing');

  const transition = startViewTransition(() => {
    flushSync(update);
    setViewTransitionName(source, EVENT_IMAGE_TRANSITION_NAME);
    dispatchModalState(false);
  });

  activeTransition = transition;
  void transition.finished.finally(() => {
    if (sequence !== transitionSequence) return;
    clearViewTransitionName(source);
    originImage = null;
    finishTransition(sequence);
    afterClose?.();
  });
}
