'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './main-events-carousel.module.css';

const MAX_VISIBLE_OFFSET = 2;
const OFFSCREEN_OFFSET = MAX_VISIBLE_OFFSET + 1;
const SWIPE_THRESHOLD_PX = 44;
const MOTION_INDICATOR_MS = 560;
const CARD_STEP_DURATION_MS = 520;
const CARD_STEP_INTERVAL_MS = CARD_STEP_DURATION_MS / 2;
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

type CarouselSlot = {
  key: string;
  event: PublicEvent;
  eventIndex: number;
  virtualIndex: number;
  offset: number;
  visible: boolean;
};

const DESKTOP_GEOMETRY: Record<number, CardGeometry> = {
  [-3]: { translateX: -792, translateY: 30, translateZ: -150, rotateY: 0, rotateZ: 0, scale: 0.7, opacity: 0, brightness: 0.74, blur: 2.6, zIndex: 0 },
  [-2]: { translateX: -528, translateY: 18, translateZ: -80, rotateY: 0, rotateZ: 0, scale: 0.8, opacity: 0.8, brightness: 0.82, blur: 1.8, zIndex: 20 },
  [-1]: { translateX: -264, translateY: 8, translateZ: -28, rotateY: 0, rotateZ: 0, scale: 0.9, opacity: 0.95, brightness: 0.92, blur: 1, zIndex: 60 },
  [0]: { translateX: 0, translateY: 0, translateZ: 0, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, blur: 0, zIndex: 100 },
  [1]: { translateX: 264, translateY: 8, translateZ: -28, rotateY: 0, rotateZ: 0, scale: 0.9, opacity: 0.95, brightness: 0.92, blur: 1, zIndex: 60 },
  [2]: { translateX: 528, translateY: 18, translateZ: -80, rotateY: 0, rotateZ: 0, scale: 0.8, opacity: 0.8, brightness: 0.82, blur: 1.8, zIndex: 20 },
  [3]: { translateX: 792, translateY: 30, translateZ: -150, rotateY: 0, rotateZ: 0, scale: 0.7, opacity: 0, brightness: 0.74, blur: 2.6, zIndex: 0 },
};

const COMPACT_GEOMETRY: Record<number, CardGeometry> = {
  [-3]: { translateX: -358, translateY: 40, translateZ: -310, rotateY: 42, rotateZ: -6, scale: 0.56, opacity: 0, brightness: 0.68, blur: 4.4, zIndex: 0 },
  [-2]: { translateX: -250, translateY: 24, translateZ: -210, rotateY: 34, rotateZ: -4, scale: 0.68, opacity: 0.7, brightness: 0.76, blur: 3.2, zIndex: 1 },
  [-1]: { translateX: -142, translateY: 10, translateZ: -90, rotateY: 22, rotateZ: -2, scale: 0.86, opacity: 0.92, brightness: 0.88, blur: 2.1, zIndex: 3 },
  [0]: { translateX: 0, translateY: 0, translateZ: 30, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, blur: 0, zIndex: 5 },
  [1]: { translateX: 142, translateY: 10, translateZ: -90, rotateY: -22, rotateZ: 2, scale: 0.86, opacity: 0.92, brightness: 0.88, blur: 2.1, zIndex: 3 },
  [2]: { translateX: 250, translateY: 24, translateZ: -210, rotateY: -34, rotateZ: 4, scale: 0.68, opacity: 0.7, brightness: 0.76, blur: 3.2, zIndex: 1 },
  [3]: { translateX: 358, translateY: 40, translateZ: -310, rotateY: -42, rotateZ: 6, scale: 0.56, opacity: 0, brightness: 0.68, blur: 4.4, zIndex: 0 },
};

function normalizeIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

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
    '--card-border-width': Math.abs(offset) === MAX_VISIBLE_OFFSET ? '1.2px' : '1px',
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
  const movementQueueRef = useRef<MovementDirection[]>([]);
  const movementActiveRef = useRef(false);
  const activeRef = useRef(0);
  const total = carouselEvents.length;
  const activeEventIndex = total ? normalizeIndex(active, total) : 0;
  const isAutoScrollPaused = isHovered || isFocusWithin || isPointerActive;

  const carouselSlots = useMemo<CarouselSlot[]>(() => {
    if (!total) return [];

    if (total >= MAX_VISIBLE_OFFSET * 2 + 1) {
      return Array.from({ length: OFFSCREEN_OFFSET * 2 + 1 }, (_, position) => {
        const offset = position - OFFSCREEN_OFFSET;
        const virtualIndex = active + offset;
        const eventIndex = normalizeIndex(virtualIndex, total);

        return {
          key: `virtual-${virtualIndex}`,
          event: carouselEvents[eventIndex],
          eventIndex,
          virtualIndex,
          offset,
          visible: Math.abs(offset) <= MAX_VISIBLE_OFFSET,
        };
      });
    }

    return carouselEvents.map((event, eventIndex) => {
      const offset = circularOffset(eventIndex, activeEventIndex, total);
      return {
        key: event.id,
        event,
        eventIndex,
        virtualIndex: active + offset,
        offset,
        visible: true,
      };
    });
  }, [active, activeEventIndex, carouselEvents, total]);

  const resetIndicatorTimer = useCallback(() => {
    if (indicatorTimerRef.current !== null) {
      window.clearTimeout(indicatorTimerRef.current);
    }

    indicatorTimerRef.current = window.setTimeout(() => {
      setDirectionIndicator(0);
      indicatorTimerRef.current = null;
    }, MOTION_INDICATOR_MS);
  }, []);

  const clearMovementTimer = useCallback(() => {
    if (stepTimerRef.current !== null) {
      window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
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
      return;
    }

    const nextActive = activeRef.current + direction;
    activeRef.current = nextActive;
    setActive(nextActive);

    stepTimerRef.current = window.setTimeout(() => {
      stepTimerRef.current = null;

      if (movementQueueRef.current.length > 0) {
        runNextMovementStep();
      } else {
        movementActiveRef.current = false;
      }
    }, CARD_STEP_INTERVAL_MS);
  }, [total]);

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

  const goTo = useCallback((virtualIndex: number) => {
    queueMovement(virtualIndex - activeRef.current);
  }, [queueMovement]);

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
    clearMovementTimer();
    activeRef.current = 0;
    setActive(0);
  }, [clearMovementTimer, total]);

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
    clearMovementTimer();
  }, [clearMovementTimer]);

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
      queueMovement(-activeRef.current);
    } else if (event.key === 'End') {
      event.preventDefault();
      setDirectionIndicator(0);
      const movement = total - 1 - normalizeIndex(activeRef.current, total);
      queueMovement(movement);
    }
  }, [goNext, goPrevious, queueMovement, total]);

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
              aria-label={`Главные события. Событие ${activeEventIndex + 1} из ${total}`}
              style={{
                '--drag-offset': `${dragOffset}px`,
                '--card-step-duration': `${CARD_STEP_DURATION_MS}ms`,
              } as React.CSSProperties}
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
              {carouselSlots.map((slot) => {
                const imageUrl = getMainEventImage(slot.event);
                if (!imageUrl) return null;

                const isCenter = slot.offset === 0;

                return (
                  <button
                    type="button"
                    key={slot.key}
                    className={cn(
                      styles.card,
                      isCenter && styles.cardActive,
                      !slot.visible && styles.cardOffscreen,
                    )}
                    style={getCardStyle(slot.offset, compact)}
                    tabIndex={slot.visible ? 0 : -1}
                    aria-hidden={!slot.visible}
                    aria-label={isCenter
                      ? `Открыть событие: ${slot.event.title}`
                      : `Показать событие: ${slot.event.title}`}
                    aria-current={isCenter ? 'true' : undefined}
                    onClick={(clickEvent) => {
                      if (!slot.visible || suppressClickRef.current) {
                        clickEvent.preventDefault();
                        return;
                      }

                      if (isCenter) {
                        openEvent(slot.event);
                      } else {
                        showMovementDirection(slot.offset < 0 ? -1 : 1);
                        goTo(slot.virtualIndex);
                      }
                    }}
                  >
                    <span className={styles.frame}>
                      <img
                        src={imageUrl}
                        alt={slot.visible ? slot.event.title : ''}
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
