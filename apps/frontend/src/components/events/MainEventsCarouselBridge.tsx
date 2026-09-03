'use client';

import { useEffect } from 'react';
import type { PublicEvent } from '@/types/event';
import { MainEventsBanner } from './MainEventsBanner';

const MAIN_EVENTS_WINDOW_SIZE = 5;
const MAIN_EVENTS_VISIBLE_RADIUS = 2;
const IOS_SWIPE_THRESHOLD_PX = 28;
const IOS_AXIS_LOCK_PX = 7;
const IOS_DRAG_LIMIT_PX = 96;
const IOS_DRAG_MOTION_MS = '90ms';
const IOS_CLICK_SUPPRESS_MS = 450;

type SwipeAxis = 'horizontal' | 'vertical' | null;

interface MainEventsCarouselBridgeProps {
  events: PublicEvent[];
}

function alignFirstRollingWindow(events: PublicEvent[]): PublicEvent[] {
  if (events.length < MAIN_EVENTS_WINDOW_SIZE) return events;

  // MainEventsBanner renders offsets -2..+2 around position 0. Rotate only
  // the presentation sequence so those five visual slots initially resolve
  // to source events 1..5. Each next step then becomes 2..6, 3..7, etc.;
  // normalizeIndex inside the banner wraps the tail back to event 1.
  return [
    ...events.slice(MAIN_EVENTS_VISIBLE_RADIUS),
    ...events.slice(0, MAIN_EVENTS_VISIBLE_RADIUS),
  ];
}

function isIosTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getTrackedTouch(touches: TouchList, identifier: number): Touch | null {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);
    if (touch?.identifier === identifier) return touch;
  }

  return null;
}

/**
 * The backend endpoint is the source of truth for public main-event selection.
 * MainEventsBanner still contains two legacy assumptions: a source-text #хит
 * marker and originalUrl-first image resolution. Normalize only the in-memory
 * presentation payload here so persisted event data and the carousel geometry
 * remain untouched while the canonical contract is enforced:
 * - every backend-selected main event reaches the banner;
 * - only the dedicated mainEventUrl can become the rendered poster;
 * - the initial five-card window follows backend order without pre-wrapping
 *   events from the end of the sequence into the first view.
 *
 * iOS Safari is less tolerant than Chromium when Pointer Events share a target
 * with vertical scrolling. A small diagonal movement can terminate the pointer
 * stream before MainEventsBanner reaches its generic swipe threshold. On iOS
 * only, keep the same full-gallery hit area but use native Touch Events with an
 * explicit axis lock. Vertical gestures remain browser-owned; horizontal ones
 * are consumed after the direction is clear and reuse the banner's keyboard
 * movement path so carousel state and animation logic stay single-sourced.
 */
export function MainEventsCarouselBridge({
  events,
}: MainEventsCarouselBridgeProps) {
  const canonicalEvents = events
    .filter((event) => Boolean(event.images?.[0]?.mainEventUrl?.trim()))
    .map((event) => ({
      ...event,
      fullDescription: event.mainEvent
        ? `${event.fullDescription ?? ''}\n<!-- #хит -->`.trim()
        : event.fullDescription,
      images: event.images?.map((image, index) =>
        index === 0
          ? {
              ...image,
              // MainEventsBanner resolves originalUrl first. Point that legacy
              // slot at the approved dedicated cover instead of allowing a
              // fallback to the source image.
              originalUrl: image.mainEventUrl?.trim() || null,
            }
          : image,
      ),
    }));

  useEffect(() => {
    if (!canonicalEvents.length || !isIosTouchDevice()) return;

    const gallery = document.querySelector<HTMLElement>(
      '#main-events [aria-roledescription="карусель"]',
    );
    if (!gallery) return;

    let touchIdentifier: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let axis: SwipeAxis = null;
    let previousMotionDuration = '';
    let suppressClickUntil = 0;

    const restoreDragVisual = () => {
      gallery.style.setProperty('--drag-offset', '0px');
      gallery.style.setProperty(
        '--card-motion-duration',
        previousMotionDuration || '520ms',
      );
    };

    const resetGesture = () => {
      touchIdentifier = null;
      startX = 0;
      startY = 0;
      lastX = 0;
      axis = null;
      restoreDragVisual();
      previousMotionDuration = '';
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) return;

      touchIdentifier = touch.identifier;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      axis = null;
      previousMotionDuration = gallery.style.getPropertyValue('--card-motion-duration');
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchIdentifier === null) return;

      const touch = getTrackedTouch(event.touches, touchIdentifier);
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      lastX = touch.clientX;

      if (
        axis === null &&
        Math.max(Math.abs(deltaX), Math.abs(deltaY)) < IOS_AXIS_LOCK_PX
      ) {
        return;
      }

      if (axis === null) {
        axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      }

      if (axis === 'horizontal') {
        if (event.cancelable) event.preventDefault();

        const visualDelta = Math.max(
          -IOS_DRAG_LIMIT_PX,
          Math.min(IOS_DRAG_LIMIT_PX, deltaX),
        );
        gallery.style.setProperty('--card-motion-duration', IOS_DRAG_MOTION_MS);
        gallery.style.setProperty('--drag-offset', `${visualDelta}px`);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchIdentifier === null) return;

      const touch = getTrackedTouch(event.changedTouches, touchIdentifier);
      const endX = touch?.clientX ?? lastX;
      const deltaX = endX - startX;
      const wasHorizontal = axis === 'horizontal';
      const shouldMove =
        wasHorizontal && Math.abs(deltaX) >= IOS_SWIPE_THRESHOLD_PX;

      if (wasHorizontal) {
        suppressClickUntil = performance.now() + IOS_CLICK_SUPPRESS_MS;
      }

      resetGesture();

      if (!shouldMove) return;

      gallery.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: deltaX > 0 ? 'ArrowLeft' : 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      );
    };

    const onTouchCancel = () => {
      resetGesture();
    };

    const stopLegacyTouchPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        event.stopPropagation();
      }
    };

    const suppressSwipeClick = (event: MouseEvent) => {
      if (performance.now() >= suppressClickUntil) return;

      event.preventDefault();
      event.stopPropagation();
    };

    gallery.addEventListener('touchstart', onTouchStart, { passive: true });
    gallery.addEventListener('touchmove', onTouchMove, { passive: false });
    gallery.addEventListener('touchend', onTouchEnd, { passive: true });
    gallery.addEventListener('touchcancel', onTouchCancel, { passive: true });
    gallery.addEventListener('pointerdown', stopLegacyTouchPointer, true);
    gallery.addEventListener('pointermove', stopLegacyTouchPointer, true);
    gallery.addEventListener('pointerup', stopLegacyTouchPointer, true);
    gallery.addEventListener('pointercancel', stopLegacyTouchPointer, true);
    gallery.addEventListener('click', suppressSwipeClick, true);

    return () => {
      gallery.removeEventListener('touchstart', onTouchStart);
      gallery.removeEventListener('touchmove', onTouchMove);
      gallery.removeEventListener('touchend', onTouchEnd);
      gallery.removeEventListener('touchcancel', onTouchCancel);
      gallery.removeEventListener('pointerdown', stopLegacyTouchPointer, true);
      gallery.removeEventListener('pointermove', stopLegacyTouchPointer, true);
      gallery.removeEventListener('pointerup', stopLegacyTouchPointer, true);
      gallery.removeEventListener('pointercancel', stopLegacyTouchPointer, true);
      gallery.removeEventListener('click', suppressSwipeClick, true);
      resetGesture();
    };
  }, [canonicalEvents.length]);

  return <MainEventsBanner events={alignFirstRollingWindow(canonicalEvents)} />;
}
