'use client';

import { flushSync } from 'react-dom';

export const EVENT_IMAGE_TRANSITION_NAME = 'event-modal-image';
export const EVENT_SURFACE_TRANSITION_NAME = 'event-modal-surface';
export const EVENT_BACKDROP_TRANSITION_NAME = 'event-modal-backdrop';

export const EVENT_MODAL_STATE_EVENT = 'ab:event-modal-state';

export const EVENT_MODAL_OPEN_DURATION_MS = 2800;
export const EVENT_MODAL_CLOSE_DURATION_MS = 2400;
export const EVENT_MODAL_CONTENT_REVEAL_START = 0.38;
export const EVENT_MODAL_CONTENT_REVEAL_END = 0.68;

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
): void {
  elements.backdrop.dataset.eventCompositeMotion = direction;
  elements.surface.dataset.eventCompositeMotion = direction;
  elements.media.dataset.eventCompositePart = 'media';
  elements.imageStage.dataset.eventCompositePart = 'image-stage';
  elements.content.dataset.eventCompositePart = 'content';

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

  elements.surface.style.removeProperty('transform-origin');
  elements.media.style.removeProperty('transform-origin');
  elements.imageStage.style.removeProperty('transform-origin');
  elements.content.style.removeProperty('transform-origin');
}

function finishAndClearActiveAnimations(): void {
  for (const animation of activeAnimations) {
    try {
      animation.finish();
    } catch {
      // An animation can already be idle after browser navigation or cancellation.
    }

    try {
      animation.cancel();
    } catch {
      // Cancellation is best-effort cleanup only.
    }
  }

  activeAnimations = [];
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

function transformForRect(target: MotionRect, finalRect: MotionRect): string {
  const scaleX = Math.max(0.02, target.width / finalRect.width);
  const scaleY = Math.max(0.02, target.height / finalRect.height);
  const translateX = target.left - finalRect.left;
  const translateY = target.top - finalRect.top;

  return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
}

function getIntermediateRect(finalRect: MotionRect): MotionRect {
  const width = Math.min(
    finalRect.width * 0.66,
    Math.max(finalRect.width * 0.58, (originRect?.width ?? 0) * 1.65),
  );
  const height = Math.min(
    finalRect.height * 0.74,
    Math.max(finalRect.height * 0.66, (originRect?.height ?? 0) * 1.5),
  );

  return {
    width,
    height,
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
  };
}

function waitForAnimations(animations: Animation[]): Promise<void> {
  return Promise.allSettled(
    animations.map((animation) => animation.finished),
  ).then(() => undefined);
}

function createOpeningAnimations(
  elements: ModalMotionElements,
  sourceRect: MotionRect,
): Animation[] {
  const finalSurfaceRect = copyRect(elements.surface.getBoundingClientRect());
  const finalMediaRect = copyRect(elements.media.getBoundingClientRect());
  const finalImageStageRect = copyRect(elements.imageStage.getBoundingClientRect());
  const intermediateRect = getIntermediateRect(finalSurfaceRect);

  const surfaceStyle = getComputedStyle(elements.surface);
  const mediaStyle = getComputedStyle(elements.media);
  const contentStyle = getComputedStyle(elements.content);
  const imageStageStyle = getComputedStyle(elements.imageStage);
  const originStyle = originImage?.parentElement
    ? getComputedStyle(originImage.parentElement)
    : null;

  const originTransform = transformForRect(sourceRect, finalSurfaceRect);
  const intermediateTransform = transformForRect(intermediateRect, finalSurfaceRect);
  const mediaFillScaleX = Math.max(1, finalSurfaceRect.width / finalMediaRect.width);
  const imageFillScaleY = Math.max(1, finalSurfaceRect.height / finalImageStageRect.height);
  const overlayTranslateX = -Math.max(0, finalMediaRect.width * 0.92);

  elements.surface.style.transformOrigin = 'top left';
  elements.media.style.transformOrigin = 'top left';
  elements.imageStage.style.transformOrigin = 'center';
  elements.content.style.transformOrigin = 'center';

  const animations = [
    animateElement(
      elements.backdrop,
      [
        { opacity: 0, backdropFilter: 'blur(0px)', offset: 0 },
        { opacity: 0.72, backdropFilter: 'blur(8px)', offset: 0.5 },
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
          transform: originTransform,
          borderRadius: originStyle?.borderRadius || '18px',
          boxShadow: '0 8px 24px rgba(13, 35, 68, .16)',
          filter: 'blur(0px)',
          offset: 0,
          easing: 'cubic-bezier(0.2, 0.72, 0.26, 1)',
        },
        {
          transform: intermediateTransform,
          borderRadius: '24px',
          boxShadow: '0 24px 70px rgba(13, 35, 68, .26)',
          filter: 'blur(1px)',
          offset: EVENT_MODAL_CONTENT_REVEAL_START,
          easing: 'ease-in-out',
        },
        {
          transform: intermediateTransform,
          borderRadius: '24px',
          boxShadow: '0 30px 84px rgba(13, 35, 68, .3)',
          filter: 'blur(0px)',
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        {
          transform: 'translate(0px, 0px) scale(1, 1)',
          borderRadius: surfaceStyle.borderRadius,
          boxShadow: surfaceStyle.boxShadow,
          filter: 'blur(0px)',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.media,
      [
        {
          transform: `scale(${mediaFillScaleX}, 1)`,
          padding: '0px',
          offset: 0,
        },
        {
          transform: `scale(${mediaFillScaleX}, 1)`,
          padding: '0px',
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        {
          transform: 'scale(1, 1)',
          padding: mediaStyle.padding,
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.imageStage,
      [
        {
          transform: `scaleY(${imageFillScaleY})`,
          borderRadius: originStyle?.borderRadius || '18px',
          boxShadow: 'none',
          offset: 0,
        },
        {
          transform: `scaleY(${imageFillScaleY})`,
          borderRadius: '22px',
          boxShadow: '0 18px 48px rgba(13, 35, 68, .2)',
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        {
          transform: 'scaleY(1)',
          borderRadius: imageStageStyle.borderRadius,
          boxShadow: imageStageStyle.boxShadow,
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.content,
      [
        {
          opacity: 0,
          transform: `translateX(${overlayTranslateX}px) scale(.88)`,
          filter: 'blur(18px)',
          backgroundColor: 'rgba(255, 255, 255, .76)',
          borderRadius: '24px',
          clipPath: 'inset(8% 7% 8% 7% round 24px)',
          offset: 0,
        },
        {
          opacity: 0,
          transform: `translateX(${overlayTranslateX}px) scale(.9)`,
          filter: 'blur(16px)',
          backgroundColor: 'rgba(255, 255, 255, .8)',
          borderRadius: '24px',
          clipPath: 'inset(8% 7% 8% 7% round 24px)',
          offset: EVENT_MODAL_CONTENT_REVEAL_START,
          easing: 'ease-out',
        },
        {
          opacity: 1,
          transform: `translateX(${overlayTranslateX}px) scale(.94)`,
          filter: 'blur(0px)',
          backgroundColor: 'rgba(255, 255, 255, .92)',
          borderRadius: '24px',
          clipPath: 'inset(5% 5% 5% 5% round 24px)',
          offset: EVENT_MODAL_CONTENT_REVEAL_END,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        {
          opacity: 1,
          transform: 'translateX(0px) scale(1)',
          filter: 'blur(0px)',
          backgroundColor: contentStyle.backgroundColor,
          borderRadius: '0px',
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.closeButton,
      [
        { opacity: 0, transform: 'scale(.7)', offset: 0 },
        { opacity: 0, transform: 'scale(.7)', offset: 0.54 },
        { opacity: 1, transform: 'scale(1)', offset: 0.76 },
        { opacity: 1, transform: 'scale(1)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.status,
      [
        { opacity: 0, transform: 'translateY(-10px)', offset: 0 },
        { opacity: 0, transform: 'translateY(-10px)', offset: 0.52 },
        { opacity: 1, transform: 'translateY(0px)', offset: 0.75 },
        { opacity: 1, transform: 'translateY(0px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_OPEN_DURATION_MS,
        fill: 'both',
      },
    ),
  ].filter((animation): animation is Animation => Boolean(animation));

  return animations;
}

function createClosingAnimations(
  elements: ModalMotionElements,
  destinationRect: MotionRect,
): Animation[] {
  const finalSurfaceRect = copyRect(elements.surface.getBoundingClientRect());
  const finalMediaRect = copyRect(elements.media.getBoundingClientRect());
  const finalImageStageRect = copyRect(elements.imageStage.getBoundingClientRect());
  const intermediateRect = getIntermediateRect(finalSurfaceRect);

  const surfaceStyle = getComputedStyle(elements.surface);
  const mediaStyle = getComputedStyle(elements.media);
  const contentStyle = getComputedStyle(elements.content);
  const imageStageStyle = getComputedStyle(elements.imageStage);
  const destinationStyle = originImage?.parentElement
    ? getComputedStyle(originImage.parentElement)
    : null;

  const destinationTransform = transformForRect(destinationRect, finalSurfaceRect);
  const intermediateTransform = transformForRect(intermediateRect, finalSurfaceRect);
  const mediaFillScaleX = Math.max(1, finalSurfaceRect.width / finalMediaRect.width);
  const imageFillScaleY = Math.max(1, finalSurfaceRect.height / finalImageStageRect.height);
  const overlayTranslateX = -Math.max(0, finalMediaRect.width * 0.92);

  elements.surface.style.transformOrigin = 'top left';
  elements.media.style.transformOrigin = 'top left';
  elements.imageStage.style.transformOrigin = 'center';
  elements.content.style.transformOrigin = 'center';

  const animations = [
    animateElement(
      elements.backdrop,
      [
        { opacity: 1, backdropFilter: 'blur(10px)', offset: 0 },
        { opacity: 0.72, backdropFilter: 'blur(8px)', offset: 0.5 },
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
          transform: 'translate(0px, 0px) scale(1, 1)',
          borderRadius: surfaceStyle.borderRadius,
          boxShadow: surfaceStyle.boxShadow,
          filter: 'blur(0px)',
          offset: 0,
          easing: 'cubic-bezier(0.2, 0.72, 0.26, 1)',
        },
        {
          transform: intermediateTransform,
          borderRadius: '24px',
          boxShadow: '0 30px 84px rgba(13, 35, 68, .3)',
          filter: 'blur(0px)',
          offset: 0.34,
          easing: 'ease-in-out',
        },
        {
          transform: intermediateTransform,
          borderRadius: '24px',
          boxShadow: '0 24px 70px rgba(13, 35, 68, .26)',
          filter: 'blur(1px)',
          offset: 0.64,
          easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        },
        {
          transform: destinationTransform,
          borderRadius: destinationStyle?.borderRadius || '18px',
          boxShadow: '0 8px 24px rgba(13, 35, 68, .16)',
          filter: 'blur(0px)',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.media,
      [
        {
          transform: 'scale(1, 1)',
          padding: mediaStyle.padding,
          offset: 0,
        },
        {
          transform: `scale(${mediaFillScaleX}, 1)`,
          padding: '0px',
          offset: 0.34,
          easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        },
        {
          transform: `scale(${mediaFillScaleX}, 1)`,
          padding: '0px',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.imageStage,
      [
        {
          transform: 'scaleY(1)',
          borderRadius: imageStageStyle.borderRadius,
          boxShadow: imageStageStyle.boxShadow,
          offset: 0,
        },
        {
          transform: `scaleY(${imageFillScaleY})`,
          borderRadius: '22px',
          boxShadow: '0 18px 48px rgba(13, 35, 68, .2)',
          offset: 0.34,
          easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        },
        {
          transform: `scaleY(${imageFillScaleY})`,
          borderRadius: destinationStyle?.borderRadius || '18px',
          boxShadow: 'none',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.content,
      [
        {
          opacity: 1,
          transform: 'translateX(0px) scale(1)',
          filter: 'blur(0px)',
          backgroundColor: contentStyle.backgroundColor,
          borderRadius: '0px',
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          offset: 0,
        },
        {
          opacity: 1,
          transform: `translateX(${overlayTranslateX}px) scale(.94)`,
          filter: 'blur(0px)',
          backgroundColor: 'rgba(255, 255, 255, .92)',
          borderRadius: '24px',
          clipPath: 'inset(5% 5% 5% 5% round 24px)',
          offset: 0.34,
          easing: 'ease-in-out',
        },
        {
          opacity: 0,
          transform: `translateX(${overlayTranslateX}px) scale(.9)`,
          filter: 'blur(16px)',
          backgroundColor: 'rgba(255, 255, 255, .8)',
          borderRadius: '24px',
          clipPath: 'inset(8% 7% 8% 7% round 24px)',
          offset: 0.64,
          easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        },
        {
          opacity: 0,
          transform: `translateX(${overlayTranslateX}px) scale(.88)`,
          filter: 'blur(18px)',
          backgroundColor: 'rgba(255, 255, 255, .76)',
          borderRadius: '24px',
          clipPath: 'inset(8% 7% 8% 7% round 24px)',
          offset: 1,
        },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.closeButton,
      [
        { opacity: 1, transform: 'scale(1)', offset: 0 },
        { opacity: 1, transform: 'scale(1)', offset: 0.22 },
        { opacity: 0, transform: 'scale(.7)', offset: 0.48 },
        { opacity: 0, transform: 'scale(.7)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        fill: 'both',
      },
    ),
    animateElement(
      elements.status,
      [
        { opacity: 1, transform: 'translateY(0px)', offset: 0 },
        { opacity: 1, transform: 'translateY(0px)', offset: 0.2 },
        { opacity: 0, transform: 'translateY(-10px)', offset: 0.46 },
        { opacity: 0, transform: 'translateY(-10px)', offset: 1 },
      ],
      {
        duration: EVENT_MODAL_CLOSE_DURATION_MS,
        fill: 'both',
      },
    ),
  ].filter((animation): animation is Animation => Boolean(animation));

  return animations;
}

function openWithoutOrigin(update: () => void): void {
  flushSync(update);

  window.requestAnimationFrame(() => {
    const elements = getModalMotionElements();
    if (!elements) return;

    markMotionElements(elements, 'opening');

    const animations = [
      animateElement(
        elements.backdrop,
        [
          { opacity: 0, backdropFilter: 'blur(0px)' },
          { opacity: 1, backdropFilter: 'blur(10px)' },
        ],
        { duration: 900, easing: 'ease-out' },
      ),
      animateElement(
        elements.surface,
        [
          { opacity: 0, transform: 'scale(.82)', filter: 'blur(18px)' },
          { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
        ],
        { duration: 1600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      ),
    ].filter((animation): animation is Animation => Boolean(animation));

    activeAnimations = animations;
    void waitForAnimations(animations).finally(() => {
      finishAndClearActiveAnimations();
      clearMotionElements(elements);
    });
  });
}

export function openEventWithTransition(
  imageElement: HTMLElement | null,
  update: () => void,
): void {
  const sequence = ++transitionSequence;
  finishAndClearActiveAnimations();
  clearMotionElements(getModalMotionElements());
  restoreOriginImage();

  originImage = imageElement?.isConnected ? imageElement : null;
  originRect = originImage ? copyRect(originImage.getBoundingClientRect()) : null;
  originVisibility = originImage?.style.visibility ?? '';

  dispatchModalState(true);

  if (prefersReducedMotion()) {
    flushSync(update);
    return;
  }

  if (!originRect) {
    openWithoutOrigin(update);
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

    markMotionElements(elements, 'opening');
    hideOriginImage();

    const animations = createOpeningAnimations(elements, sourceRect);
    activeAnimations = animations;

    void waitForAnimations(animations).finally(() => {
      if (sequence !== transitionSequence) return;
      finishAndClearActiveAnimations();
      clearMotionElements(elements);
    });
  });
}

export function closeEventWithTransition(
  update: () => void,
  afterClose?: () => void,
): void {
  const sequence = ++transitionSequence;
  finishAndClearActiveAnimations();

  const elements = getModalMotionElements();
  const destinationRect = getConnectedOriginRect();

  const finalize = () => {
    clearMotionElements(elements);
    restoreOriginImage();
    dispatchModalState(false);
    afterClose?.();
  };

  if (prefersReducedMotion() || !elements || !destinationRect) {
    flushSync(update);
    finalize();
    return;
  }

  markMotionElements(elements, 'closing');

  const animations = createClosingAnimations(elements, destinationRect);
  activeAnimations = animations;

  void waitForAnimations(animations).finally(() => {
    if (sequence !== transitionSequence) return;

    flushSync(update);
    finishAndClearActiveAnimations();
    finalize();
  });
}
