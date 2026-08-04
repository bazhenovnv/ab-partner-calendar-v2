'use client';

import { flushSync } from 'react-dom';

export const EVENT_IMAGE_TRANSITION_NAME = 'event-modal-image';
export const EVENT_SURFACE_TRANSITION_NAME = 'event-modal-surface';
export const EVENT_BACKDROP_TRANSITION_NAME = 'event-modal-backdrop';

export const EVENT_MODAL_STATE_EVENT = 'ab:event-modal-state';

export const EVENT_MODAL_OPEN_DURATION_MS = 1400;
export const EVENT_MODAL_CLOSE_DURATION_MS = 1200;
export const EVENT_MODAL_CONTENT_REVEAL_START = 0.28;
export const EVENT_MODAL_CONTENT_REVEAL_END = 0.88;

type MotionDirection = 'opening' | 'closing';

type MotionRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ModalMotionElements = {
  backdrop: HTMLElement;
  surface: HTMLElement;
  media: HTMLElement;
  imageStage: HTMLElement;
  image: HTMLElement;
  content: HTMLElement;
  closeButton: HTMLElement | null;
  status: HTMLElement | null;
};

let originImage: HTMLElement | null = null;
let originRect: MotionRect | null = null;
let originVisibility = '';
let activeAnimations: Animation[] = [];
let activeClone: HTMLImageElement | null = null;
let activeElements: ModalMotionElements | null = null;
let activeDirection: MotionDirection | null = null;
let activeMotionDone: Promise<void> | null = null;
let transitionSequence = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function dispatchModalState(open: boolean): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_MODAL_STATE_EVENT, {
      detail: { open },
    }),
  );
}

function copyRect(rect: DOMRectReadOnly): MotionRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function getConnectedOriginRect(): MotionRect | null {
  if (originImage?.isConnected) {
    return copyRect(originImage.getBoundingClientRect());
  }

  return originRect;
}

function getModalMotionElements(): ModalMotionElements | null {
  const backdrop = document.querySelector<HTMLElement>('[data-event-modal-backdrop]');
  const surface = document.querySelector<HTMLElement>('[data-event-modal-surface]');
  const image = document.querySelector<HTMLElement>('[data-event-modal-image]');
  const imageStage = image?.parentElement;
  const media = imageStage?.parentElement;
  const contentCandidate = media?.nextElementSibling;
  const content = contentCandidate instanceof HTMLElement ? contentCandidate : null;

  if (!backdrop || !surface || !media || !imageStage || !image || !content) {
    return null;
  }

  return {
    backdrop,
    surface,
    media,
    imageStage,
    image,
    content,
    closeButton: surface.querySelector<HTMLElement>('button[aria-label="Закрыть"]'),
    status: surface.querySelector<HTMLElement>(':scope > span'),
  };
}

function markMotionElements(
  elements: ModalMotionElements,
  direction: MotionDirection,
  hideModalImage: boolean,
): void {
  activeElements = elements;
  activeDirection = direction;

  elements.backdrop.dataset.eventCompositeMotion = direction;
  elements.surface.dataset.eventCompositeMotion = direction;
  elements.media.dataset.eventCompositePart = 'media';
  elements.content.dataset.eventCompositePart = 'content';

  if (hideModalImage) {
    elements.imageStage.dataset.eventCompositePart = 'image-stage';
  }

  if (elements.closeButton) {
    elements.closeButton.dataset.eventCompositePart = 'chrome';
  }

  if (elements.status) {
    elements.status.dataset.eventCompositePart = 'chrome';
  }
}

function clearMotionElements(elements: ModalMotionElements | null): void {
  if (!elements) return;

  delete elements.backdrop.dataset.eventCompositeMotion;
  delete elements.surface.dataset.eventCompositeMotion;
  delete elements.media.dataset.eventCompositePart;
  delete elements.imageStage.dataset.eventCompositePart;
  delete elements.content.dataset.eventCompositePart;

  if (elements.closeButton) {
    delete elements.closeButton.dataset.eventCompositePart;
  }

  if (elements.status) {
    delete elements.status.dataset.eventCompositePart;
  }
}

function cancelActiveAnimations(): void {
  for (const animation of activeAnimations) {
    try {
      animation.cancel();
    } catch {
      // Best-effort cleanup after navigation or browser cancellation.
    }
  }

  activeAnimations = [];
}

function removeActiveClone(): void {
  activeClone?.remove();
  activeClone = null;
}

function clearActiveMotion(): void {
  cancelActiveAnimations();
  clearMotionElements(activeElements);
  removeActiveClone();
  activeElements = null;
  activeDirection = null;
  activeMotionDone = null;
}

function restoreOriginImage(): void {
  if (originImage?.isConnected) {
    originImage.style.visibility = originVisibility;
  }

  originImage = null;
  originRect = null;
  originVisibility = '';
}

function hideOriginImage(): void {
  if (!originImage?.isConnected) return;
  originImage.style.visibility = 'hidden';
}

function animateElement(
  element: HTMLElement | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!element) return null;

  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

function getImageElement(element: HTMLElement | null): HTMLImageElement | null {
  return element instanceof HTMLImageElement ? element : null;
}

function getBorderRadius(
  element: Element | null | undefined,
  fallback = '18px',
): string {
  if (!(element instanceof HTMLElement)) return fallback;
  return getComputedStyle(element).borderRadius || fallback;
}

function createImageFlightClone(
  source: HTMLImageElement,
  startRect: MotionRect,
  borderRadius: string,
): HTMLImageElement {
  const clone = document.createElement('img');
  const sourceStyle = getComputedStyle(source);

  clone.src = source.currentSrc || source.src;
  clone.alt = '';
  clone.draggable = false;
  clone.decoding = 'async';
  clone.setAttribute('aria-hidden', 'true');

  clone.style.position = 'fixed';
  clone.style.top = `${startRect.top}px`;
  clone.style.left = `${startRect.left}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  clone.style.margin = '0';
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.objectFit = sourceStyle.objectFit || 'cover';
  clone.style.objectPosition = sourceStyle.objectPosition || '50% 50%';
  clone.style.borderRadius = borderRadius;
  clone.style.boxShadow = '0 8px 24px rgba(13, 35, 68, .16)';
  clone.style.pointerEvents = 'none';
  clone.style.userSelect = 'none';
  clone.style.zIndex = '1205';
  clone.style.willChange = 'top, left, width, height, border-radius, box-shadow';

  document.body.appendChild(clone);
  activeClone = clone;
  return clone;
}

function imageRectKeyframe(
  rect: MotionRect,
  borderRadius: string,
  boxShadow: string,
  offset: number,
): Keyframe {
  return {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius,
    boxShadow,
    opacity: 1,
    offset,
  };
}

function animateImageFlight(
  clone: HTMLImageElement,
  fromRect: MotionRect,
  toRect: MotionRect,
  fromRadius: string,
  toRadius: string,
  duration: number,
  direction: MotionDirection,
): Animation | null {
  const easing =
    direction === 'opening'
      ? 'cubic-bezier(0.16, 1, 0.3, 1)'
      : 'cubic-bezier(0.55, 0, 1, 0.45)';

  return animateElement(
    clone,
    [
      imageRectKeyframe(
        fromRect,
        fromRadius,
        '0 8px 24px rgba(13, 35, 68, .16)',
        0,
      ),
      imageRectKeyframe(
        toRect,
        toRadius,
        direction === 'opening'
          ? '0 18px 48px rgba(13, 35, 68, .2)'
          : '0 8px 24px rgba(13, 35, 68, .16)',
        1,
      ),
    ],
    {
      duration,
      easing,
      fill: 'both',
    },
  );
}

function createShellOpeningAnimations(elements: ModalMotionElements): Animation[] {
  const surfaceStyle = getComputedStyle(elements.surface);
  const mediaStyle = getComputedStyle(elements.media);

  return [
    animateElement(
      elements.backdrop,
      [
        { opacity: 0, backdropFilter: 'blur(0px)', offset: 0 },
        { opacity: 0.78, backdropFilter: 'blur(8px)', offset: 0.58 },
        { opacity: 1, backdropFilter: 'blur(10px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        easing: 'linear',
        fill: 'both',
      },
    ),
    animateElement(
      elements.surface,
      [
        {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          boxShadow: '0 0 0 rgba(13, 35, 68, 0)',
          offset: 0,
        },
        {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          boxShadow: '0 0 0 rgba(13, 35, 68, 0)',
          offset: EVENT_MODAL_CONTENT_REVEAL_START,
        },
        {
          backgroundColor: surfaceStyle.backgroundColor,
          boxShadow: surfaceStyle.boxShadow,
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
        },
        {
          backgroundColor: surfaceStyle.backgroundColor,
          boxShadow: surfaceStyle.boxShadow,
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        easing: 'linear',
        fill: 'both',
      },
    ),
    animateElement(
      elements.media,
      [
        { backgroundColor: 'rgba(255, 255, 255, 0)', offset: 0 },
        {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          offset: EVENT_MODAL_CONTENT_REVEAL_START,
        },
        {
          backgroundColor: mediaStyle.backgroundColor,
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
        },
        { backgroundColor: mediaStyle.backgroundColor, offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        easing: 'linear',
        fill: 'both',
      },
    ),
    animateElement(
      elements.content,
      [
        { opacity: 0, filter: 'blur(26px)', offset: 0 },
        {
          opacity: 0,
          filter: 'blur(26px)',
          offset: EVENT_MODAL_CONTENT_REVEAL_START,
        },
        { opacity: 0.55, filter: 'blur(11px)', offset: 0.66 },
        {
          opacity: 1,
          filter: 'blur(0px)',
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
        },
        { opacity: 1, filter: 'blur(0px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      },
    ),
    animateElement(
      elements.closeButton,
      [
        { opacity: 0, filter: 'blur(14px)', offset: 0 },
        { opacity: 0, filter: 'blur(14px)', offset: 0.52 },
        { opacity: 1, filter: 'blur(0px)', offset: 0.9 },
        { opacity: 1, filter: 'blur(0px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        easing: 'ease-out',
        fill: 'both',
      },
    ),
    animateElement(
      elements.status,
      [
        { opacity: 0, filter: 'blur(14px)', offset: 0 },
        { opacity: 0, filter: 'blur(14px)', offset: 0.48 },
        { opacity: 1, filter: 'blur(0px)', offset: 0.86 },
        { opacity: 1, filter: 'blur(0px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        easing: 'ease-out',
        fill: 'both',
      },
    ),
  ].filter((animation): animation is Animation => Boolean(animation));
}

function createShellClosingAnimations(elements: ModalMotionElements): Animation[] {
  const surfaceStyle = getComputedStyle(elements.surface);
  const mediaStyle = getComputedStyle(elements.media);

  return [
    animateElement(
      elements.backdrop,
      [
        { opacity: 1, backdropFilter: 'blur(10px)', offset: 0 },
        { opacity: 0.72, backdropFilter: 'blur(8px)', offset: 0.46 },
        { opacity: 0, backdropFilter: 'blur(0px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        easing: 'linear',
        fill: 'both',
      },
    ),
    animateElement(
      elements.surface,
      [
        {
          backgroundColor: surfaceStyle.backgroundColor,
          boxShadow: surfaceStyle.boxShadow,
          offset: 0,
        },
        {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          boxShadow: '0 0 0 rgba(13, 35, 68, 0)',
          offset: 0.7,
        },
        {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          boxShadow: '0 0 0 rgba(13, 35, 68, 0)',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        easing: 'linear',
        fill: 'both',
      },
    ),
    animateElement(
      elements.media,
      [
        { backgroundColor: mediaStyle.backgroundColor, offset: 0 },
        { backgroundColor: 'rgba(255, 255, 255, 0)', offset: 0.7 },
        { backgroundColor: 'rgba(255, 255, 255, 0)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        easing: 'linear',
        fill: 'both',
      },
    ),
    animateElement(
      elements.content,
      [
        { opacity: 1, filter: 'blur(0px)', offset: 0 },
        { opacity: 0.55, filter: 'blur(11px)', offset: 0.3 },
        { opacity: 0, filter: 'blur(26px)', offset: 0.62 },
        { opacity: 0, filter: 'blur(26px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        fill: 'both',
      },
    ),
    animateElement(
      elements.closeButton,
      [
        { opacity: 1, filter: 'blur(0px)', offset: 0 },
        { opacity: 0, filter: 'blur(14px)', offset: 0.38 },
        { opacity: 0, filter: 'blur(14px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        easing: 'ease-in',
        fill: 'both',
      },
    ),
    animateElement(
      elements.status,
      [
        { opacity: 1, filter: 'blur(0px)', offset: 0 },
        { opacity: 0, filter: 'blur(14px)', offset: 0.42 },
        { opacity: 0, filter: 'blur(14px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        easing: 'ease-in',
        fill: 'both',
      },
    ),
  ].filter((animation): animation is Animation => Boolean(animation));
}

function waitForAnimations(animations: Animation[]): Promise<void> {
  return Promise.allSettled(
    animations.map((animation) => animation.finished),
  ).then(() => undefined);
}

function finishOpeningMotion(
  sequence: number,
  elements: ModalMotionElements,
): void {
  if (sequence !== transitionSequence) return;

  clearMotionElements(elements);
  removeActiveClone();
  cancelActiveAnimations();
  activeElements = null;
  activeDirection = null;
  activeMotionDone = null;
}

function openWithoutImageOrigin(update: () => void): void {
  flushSync(update);

  window.requestAnimationFrame(() => {
    const elements = getModalMotionElements();
    if (!elements) return;

    const sequence = transitionSequence;
    markMotionElements(elements, 'opening', false);
    const animations = createShellOpeningAnimations(elements);

    activeAnimations = animations;
    activeMotionDone = waitForAnimations(animations);

    void activeMotionDone.finally(() => finishOpeningMotion(sequence, elements));
  });
}

export function openEventWithTransition(
  imageElement: HTMLElement | null,
  update: () => void,
): void {
  const sequence = ++transitionSequence;

  clearActiveMotion();
  restoreOriginImage();

  originImage = imageElement?.isConnected ? imageElement : null;
  originRect = originImage ? copyRect(originImage.getBoundingClientRect()) : null;
  originVisibility = originImage?.style.visibility ?? '';

  dispatchModalState(true);

  if (prefersReducedMotion()) {
    flushSync(update);
    return;
  }

  const originImageElement = getImageElement(originImage);
  if (!originRect || !originImageElement) {
    openWithoutImageOrigin(update);
    return;
  }

  flushSync(update);

  window.requestAnimationFrame(() => {
    if (sequence !== transitionSequence) return;

    const elements = getModalMotionElements();
    const sourceRect = getConnectedOriginRect();

    if (!elements || !sourceRect) {
      restoreOriginImage();
      return;
    }

    const finalImageRect = copyRect(elements.imageStage.getBoundingClientRect());
    const sourceRadius = getBorderRadius(originImageElement.parentElement);
    const finalRadius = getBorderRadius(elements.imageStage, '20px');
    const clone = createImageFlightClone(
      originImageElement,
      sourceRect,
      sourceRadius,
    );

    markMotionElements(elements, 'opening', true);
    hideOriginImage();

    const imageAnimation = animateImageFlight(
      clone,
      sourceRect,
      finalImageRect,
      sourceRadius,
      finalRadius,
      EVENT_MODAL_OPEN_DURATION_MS,
      'opening',
    );
    const shellAnimations = createShellOpeningAnimations(elements);
    const animations = [imageAnimation, ...shellAnimations].filter(
      (animation): animation is Animation => Boolean(animation),
    );

    activeAnimations = animations;
    activeMotionDone = waitForAnimations(animations);

    void activeMotionDone.finally(() => finishOpeningMotion(sequence, elements));
  });
}

export function closeEventWithTransition(
  update: () => void,
  afterClose?: () => void,
): void {
  if (activeDirection === 'opening' && activeMotionDone) {
    const openingDone = activeMotionDone;
    void openingDone.finally(() => closeEventWithTransition(update, afterClose));
    return;
  }

  const sequence = ++transitionSequence;
  clearActiveMotion();

  const elements = getModalMotionElements();
  const destinationRect = getConnectedOriginRect();
  const modalImage = getImageElement(elements?.image ?? null);

  const finalize = () => {
    clearMotionElements(elements);
    restoreOriginImage();
    removeActiveClone();
    cancelActiveAnimations();
    activeElements = null;
    activeDirection = null;
    activeMotionDone = null;
    dispatchModalState(false);
    afterClose?.();
  };

  if (
    prefersReducedMotion() ||
    !elements ||
    !destinationRect ||
    !modalImage
  ) {
    flushSync(update);
    finalize();
    return;
  }

  const startRect = copyRect(elements.imageStage.getBoundingClientRect());
  const startRadius = getBorderRadius(elements.imageStage, '20px');
  const destinationRadius = getBorderRadius(originImage?.parentElement);
  const clone = createImageFlightClone(modalImage, startRect, startRadius);

  markMotionElements(elements, 'closing', true);

  const imageAnimation = animateImageFlight(
    clone,
    startRect,
    destinationRect,
    startRadius,
    destinationRadius,
    EVENT_MODAL_CLOSE_DURATION_MS,
    'closing',
  );
  const shellAnimations = createShellClosingAnimations(elements);
  const animations = [imageAnimation, ...shellAnimations].filter(
    (animation): animation is Animation => Boolean(animation),
  );

  activeAnimations = animations;
  activeMotionDone = waitForAnimations(animations);

  void activeMotionDone.finally(() => {
    if (sequence !== transitionSequence) return;

    flushSync(update);
    finalize();
  });
}
