'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './main-events-carousel.module.css';

const MAX_VISIBLE_OFFSET = 2;
const SWIPE_THRESHOLD_PX = 44;
const MOTION_INDICATOR_MS = 560;
const CARD_WRAP_INTERVAL_MS = 300;
const AUTO_SCROLL_MS = 10_000;
const HIT_MARKER = /(?:^|\s)#хит(?=\s|$|[.,;:!?])/i;

type DirectionIndicator = -1 | 0 | 1;
type MovementDirection = -1 | 1;

type CardGeometry = {
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  opacity: number;
  brightness: number;
  blur: number;
  zIndex: number;
};

const DESKTOP_GEOMETRY: Record<number, CardGeometry> = {
  [-2]: { translateX: -528, translateY: 18, translateZ: -80, rotateY: 0, rotateZ: 0, scale: 0.8, opacity: 0.8, brightness: 0.82, blur: 1.8, zIndex: 20 },
  [-1]: { translateX: -264, translateY: 8, translateZ: -28, rotateY: 0, rotateZ: 0, scale: 0.9, opacity: 0.95, brightness: 0.92, blur: 1, zIndex: 60 },
  [0]: { translateX: 0, translateY: 0, translateZ: 0, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, blur: 0, zIndex: 100 },
  [1]: { translateX: 264, translateY: 8, translateZ: -28, rotateY: 0, rotateZ: 0, scale: 0.9, opacity: 0.95, brightness: 0.92, blur: 1, zIndex: 60 },
  [2]: { translateX: 528, translateY: 18, translateZ: -80, rotateY: 0, rotateZ: 0, scale: 0.8, opacity: 0.8, brightness: 0.82, blur: 1.8, zIndex: 20 },
};

const COMPACT_GEOMETRY: Record<number, CardGeometry> = {
  [-2]: { translateX: -250, translateY: 24, translateZ: -210, rotateY: 34, rotateZ: -4, scale: 0.68, opacity: 0.7, brightness: 0.76, blur: 3.2, zIndex: 1 },
  [-1]: { translateX: -142, translateY: 10, translateZ: -90, rotateY: 22, rotateZ: -2, scale: 0.86, opacity: 0.92, brightness: 0.88, blur: 2.1, zIndex: 3 },
  [0]: { translateX: 0, translateY: 0, translateZ: 30, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, blur: 0, zIndex: 5 },
  [1]: { translateX: 142, translateY: 10, translateZ: -90, rotateY: -22, rotateZ: 2, scale: 0.86, opacity: 0.92, brightness: 0.88, blur: 2.1, zIndex: 3 },
  [2]: { translateX: 250, translateY: 24, translateZ: -210, rotateY: -34, rotateZ: 4, scale: 0.68, opacity: 0.7, brightness: 0.76, blur: 3.2, zIndex: 1 },
};

function circularOffset(index: number, active: number, total: number): number {
  const distance = (index - active + total) % total;
  return distance > Math.floor(total / 2) ? distance - total : distance;
}

function getCardStyle(offset: number, compact: boolean): React.CSSProperties {
  const geometry = (compact ? COMPACT_GEOMETRY : DESKTOP_GEOMETRY)[offset];

  return {
    '--card-x': `${geometry.translateX}px`,
    '--card-y': `${geometry.translateY}px`,
    '--card-z': `${geometry.translateZ}px`,
    '--card-rotate-y': `${geometry.rotateY}deg`,
    '--card-rotate-z': `${geometry.rotateZ}deg`,
    '--card-scale': geometry.scale,
    '--card-opacity': geometry.opacity,
    '--card-brightness': geometry.brightness,
    '--card-blur': `${geometry.blur}px`,
    zIndex: geometry.zIndex,
  } as React.CSSProperties;
}

function hasHitMarker(event: PublicEvent): boolean {
  const sourceText = [event.title, event.shortDescription, event.fullDescription]
    .filter((value): value is string => Boolean(value))
    .join('\n');

  return HIT_MARKER.test(sourceText);
}

function getMainEventImage(event: PublicEvent): string | null {
  const image = event.images?.[0];
  if (!image) return null;

  // Posts marked #Хит use the untouched square source image.
  // mainEventUrl remains a compatibility fallback for older records.
  return image.originalUrl?.trim() || image.mainEventUrl?.trim() || null;
}

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const { openEvent } = useEventModal();
  const carouselEvents = useMemo(
    () => events.filter((event) => event.mainEvent && hasHitMarker(event) && getMainEventImage(event)),
    [events],
  );
  const [active, setActive] = useState(0);
  const [directionIndicator, setDirectionIndicator] = useState<DirectionIndicator>(0);
  const [deferredCardId, setDeferredCardId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const indicatorTimerRef = useRef<number | null>(null);
  const stepTimerRef = useRef<number | null>(null);
  const nextStepFrameRef = useRef<number | null>(null);
  const movementQueueRef = useRef<MovementDirection[]>([]);
  const movementActiveRef = useRef(false);
  const activeRef = useRef(0);
  const total = carouselEvents.length;
  const isAutoScrollPaused = isHovered || isFocusWithin || isPointerActive;

  const resetIndicatorTimer = useCallback(() => {
    if (indicatorTimerRef.current !== null) {
      window.clearTimeout(indicatorTimerRef.current);
    }

    indicatorTimerRef.current = window.setTimeout(() => {
      setDirectionIndicator(0);
      indicatorTimerRef.current = null;
    }, MOTION_INDICATOR_MS);
  }, []);

  const clearMovementTimers = useCallback(() => {
    if (stepTimerRef.current !== null) {
      window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }

    if (nextStepFrameRef.current !== null) {
      window.cancelAnimationFrame(nextStepFrameRef.current);
      nextStepFrameRef.current = null;
    }
  }, []);

  const showMovementDirection = useCallback((direction: Exclude<DirectionIndicator, 0>) => {
    setDirectionIndicator(direction);
    resetIndicatorTimer();
  }, [resetIndicatorTimer]);

  const runNextMovementStep = useCallback(function runNextMovementStep() {
    const direction = movementQueueRef.current.shift();

    if (!direction || !total) {
      movementActiveRef.current = false;
      setDeferredCardId(null);
      return;
    }

    const currentActive = activeRef.current;
    const nextActive = ((currentActive + direction) % total + total) % total;
    const cardPositions = carouselEvents.map((event, eventIndex) => ({
      event,
      previousOffset: circularOffset(eventIndex, currentActive, total),
      nextOffset: circularOffset(eventIndex, nextActive, total),
    }));
    const previouslyVisibleIds = new Set(
      cardPositions
        .filter(({ previousOffset }) => Math.abs(previousOffset) <= MAX_VISIBLE_OFFSET)
        .map(({ event }) => event.id),
    );
    const wrappedVisibleCard = cardPositions.find(({ previousOffset, nextOffset }) => (
      previousOffset === -direction * MAX_VISIBLE_OFFSET &&
      nextOffset === direction * MAX_VISIBLE_OFFSET
    ));
    const newlyVisibleCard = cardPositions.find(({ event, nextOffset }) => (
      Math.abs(nextOffset) <= MAX_VISIBLE_OFFSET && !previouslyVisibleIds.has(event.id)
    ));
    const cardToReveal = wrappedVisibleCard ?? newlyVisibleCard;

    setDeferredCardId(cardToReveal?.event.id ?? null);
    activeRef.current = nextActive;
    setActive(nextActive);

    stepTimerRef.current = window.setTimeout(() => {
      stepTimerRef.current = null;
      setDeferredCardId(null);

      if (movementQueueRef.current.length > 0) {
        nextStepFrameRef.current = window.requestAnimationFrame(() => {
          nextStepFrameRef.current = null;
          runNextMovementStep();
        });
      } else {
        movementActiveRef.current = false;
      }
    }, CARD_WRAP_INTERVAL_MS);
  }, [carouselEvents, total]);

  const queueMovement = useCallback((movement: number) => {
    if (!total || movement === 0 || movementActiveRef.current) return;

    const direction: MovementDirection = movement < 0 ? -1 : 1;
    movementQueueRef.current = Array.from(
      { length: Math.abs(movement) },
      () => direction,
    );
    movementActiveRef.current = true;
    runNextMovementStep();
  }, [runNextMovementStep, total]);

  const goTo = useCallback((index: number) => {
    if (!total) return;

    const nextActive = ((index % total) + total) % total;
    const movement = circularOffset(nextActive, activeRef.current, total);
    queueMovement(movement);
  }, [queueMovement, total]);

  const goPrevious = useCallback(() => {
    showMovementDirection(-1);
    queueMovement(-1);
  }, [queueMovement, showMovementDirection]);

  const goNext = useCallback(() => {
    showMovementDirection(1);
    queueMovement(1);
  }, [queueMovement, showMovementDirection]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    movementQueueRef.current = [];
    movementActiveRef.current = false;
    clearMovementTimers();
    setDeferredCardId(null);
  }, [clearMovementTimers, total]);

  useEffect(() => {
    if (active >= total && total > 0) {
      activeRef.current = 0;
      setActive(0);
    }
  }, [active, total]);

  useEffect(() => {
    if (total <= 1 || isAutoScrollPaused) return;

    const timer = window.setTimeout(() => {
      if (movementActiveRef.current) return;
      showMovementDirection(1);
      queueMovement(1);
    }, AUTO_SCROLL_MS);

    return () => window.clearTimeout(timer);
  }, [active, total, isAutoScrollPaused, queueMovement, showMovementDirection]);

  useEffect(() => () => {
    if (indicatorTimerRef.current !== null) {
      window.clearTimeout(indicatorTimerRef.current);
    }
    movementQueueRef.current = [];
    movementActiveRef.current = false;
    clearMovementTimers();
  }, [clearMovementTimers]);

  const finishPointerInteraction = useCallback((clientX?: number) => {
    const startX = pointerStartXRef.current;
    const wasDragging = dragStartedRef.current;

    if (startX !== null && typeof clientX === 'number') {
      const delta = clientX - startX;
      if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
        delta > 0 ? goPrevious() : goNext();
      }
    }

    if (wasDragging) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    pointerStartXRef.current = null;
    pointerIdRef.current = null;
    dragStartedRef.current = false;
    setDragOffset(0);
    setIsPointerActive(false);
  }, [goNext, goPrevious]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    setIsPointerActive(true);
    pointerStartXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    dragStartedRef.current = false;
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartXRef.current === null || pointerIdRef.current !== event.pointerId) return;
    const delta = event.clientX - pointerStartXRef.current;

    if (!dragStartedRef.current && Math.abs(delta) >= 6) {
      dragStartedRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (dragStartedRef.current) {
      setDragOffset(Math.max(-96, Math.min(96, delta)));
    }
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    finishPointerInteraction(event.clientX);
  }, [finishPointerInteraction]);

  const onPointerCancel = useCallback(() => finishPointerInteraction(), [finishPointerInteraction]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setDirectionIndicator(0);
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setDirectionIndicator(0);
      goTo(total - 1);
    }
  }, [goNext, goPrevious, goTo, total]);

  return (
    <section id="main-events" className={styles.section} aria-labelledby="main-events-title">
      <div className={styles.outer}>
        <h2 id="main-events-title" className={styles.title}>Главные события</h2>

        {!total ? (
          <div className={styles.empty} role="status">
            <p>Главные события пока не опубликованы</p>
          </div>
        ) : (
          <>
            <div
              ref={galleryRef}
              className={cn(styles.gallery, dragOffset !== 0 && styles.galleryDragging)}
              tabIndex={0}
              role="region"
              aria-roledescription="карусель"
              aria-label={`Главные события. Событие ${active + 1} из ${total}`}
              style={{ '--drag-offset': `${dragOffset}px` } as React.CSSProperties}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onFocusCapture={() => setIsFocusWithin(true)}
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget;
                if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                  setIsFocusWithin(false);
                }
              }}
            >
              {carouselEvents.map((event, index) => {
                const offset = circularOffset(index, active, total);
                if (Math.abs(offset) > MAX_VISIBLE_OFFSET || event.id === deferredCardId) return null;

                const imageUrl = getMainEventImage(event);
                if (!imageUrl) return null;
                const isCenter = offset === 0;

                return (
                  <button
                    type="button"
                    key={event.id}
                    className={cn(styles.card, isCenter && styles.cardActive)}
                    style={getCardStyle(offset, compact)}
                    aria-label={isCenter ? `Открыть событие: ${event.title}` : `Показать событие: ${event.title}`}
                    aria-current={isCenter ? 'true' : undefined}
                    onClick={(clickEvent) => {
                      if (suppressClickRef.current) {
                        clickEvent.preventDefault();
                        return;
                      }

                      if (isCenter) {
                        openEvent(event);
                      } else {
                        showMovementDirection(offset < 0 ? -1 : 1);
                        goTo(index);
                      }
                    }}
                  >
                    <span className={styles.frame}>
                      <img
                        src={imageUrl}
                        alt={event.title}
                        loading={isCenter ? 'eager' : 'lazy'}
                        fetchPriority={isCenter ? 'high' : 'auto'}
                        draggable={false}
                        className={styles.poster}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            {total > 1 && (
              <nav className={styles.nav} aria-label="Навигация по главным событиям">
                <button type="button" onClick={goPrevious} className={styles.navButton} aria-label="Предыдущее событие">‹</button>
                <div className={styles.dots} role="group" aria-label="Направление перемещения карусели">
                  <button
                    type="button"
                    onClick={goPrevious}
                    aria-label="Переместить карусель влево"
                    aria-current={directionIndicator === -1 ? 'true' : undefined}
                    className={cn(styles.dot, directionIndicator === -1 && styles.dotActive)}
                  />
                  <button
                    type="button"
                    onClick={() => setDirectionIndicator(0)}
                    aria-label="Текущее положение карусели"
                    aria-current={directionIndicator === 0 ? 'true' : undefined}
                    className={cn(styles.dot, directionIndicator === 0 && styles.dotActive)}
                  />
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Переместить карусель вправо"
                    aria-current={directionIndicator === 1 ? 'true' : undefined}
                    className={cn(styles.dot, directionIndicator === 1 && styles.dotActive)}
                  />
                </div>
                <button type="button" onClick={goNext} className={styles.navButton} aria-label="Следующее событие">›</button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
