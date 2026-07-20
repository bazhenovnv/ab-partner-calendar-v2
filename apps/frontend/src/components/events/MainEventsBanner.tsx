'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './main-events-carousel.module.css';

const MAX_VISIBLE_OFFSET = 2;
const SWIPE_THRESHOLD_PX = 44;

type DirectionIndicator = -1 | 0 | 1;

type CardGeometry = {
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  opacity: number;
  brightness: number;
  zIndex: number;
};

const DESKTOP_GEOMETRY: Record<number, CardGeometry> = {
  [-2]: { translateX: -405, translateY: 14, translateZ: -60, rotateY: 0, rotateZ: 0, scale: 0.74, opacity: 0.82, brightness: 0.72, zIndex: 1 },
  [-1]: { translateX: -205, translateY: 6, translateZ: -18, rotateY: 0, rotateZ: 0, scale: 0.89, opacity: 0.95, brightness: 0.9, zIndex: 4 },
  [0]: { translateX: 0, translateY: 0, translateZ: 0, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, zIndex: 10 },
  [1]: { translateX: 205, translateY: 6, translateZ: -18, rotateY: 0, rotateZ: 0, scale: 0.89, opacity: 0.95, brightness: 0.9, zIndex: 4 },
  [2]: { translateX: 405, translateY: 14, translateZ: -60, rotateY: 0, rotateZ: 0, scale: 0.74, opacity: 0.82, brightness: 0.72, zIndex: 1 },
};

const COMPACT_GEOMETRY: Record<number, CardGeometry> = {
  [-2]: { translateX: -250, translateY: 24, translateZ: -210, rotateY: 34, rotateZ: -4, scale: 0.68, opacity: 0.7, brightness: 0.76, zIndex: 1 },
  [-1]: { translateX: -142, translateY: 10, translateZ: -90, rotateY: 22, rotateZ: -2, scale: 0.86, opacity: 0.92, brightness: 0.88, zIndex: 3 },
  [0]: { translateX: 0, translateY: 0, translateZ: 30, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, zIndex: 5 },
  [1]: { translateX: 142, translateY: 10, translateZ: -90, rotateY: -22, rotateZ: 2, scale: 0.86, opacity: 0.92, brightness: 0.88, zIndex: 3 },
  [2]: { translateX: 250, translateY: 24, translateZ: -210, rotateY: -34, rotateZ: 4, scale: 0.68, opacity: 0.7, brightness: 0.76, zIndex: 1 },
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
    zIndex: geometry.zIndex,
  } as React.CSSProperties;
}

function getMainEventImage(event: PublicEvent): string | null {
  const url = event.images?.[0]?.mainEventUrl?.trim();
  return url || null;
}

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const { openEvent } = useEventModal();
  const carouselEvents = useMemo(
    () => events.filter((event) => event.mainEvent && getMainEventImage(event)),
    [events],
  );
  const [active, setActive] = useState(0);
  const [directionIndicator, setDirectionIndicator] = useState<DirectionIndicator>(0);
  const [compact, setCompact] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const total = carouselEvents.length;

  const goTo = useCallback((index: number) => {
    if (!total) return;
    setActive(((index % total) + total) % total);
  }, [total]);

  const goPrevious = useCallback(() => {
    setDirectionIndicator(-1);
    goTo(active - 1);
  }, [active, goTo]);

  const goNext = useCallback(() => {
    setDirectionIndicator(1);
    goTo(active + 1);
  }, [active, goTo]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (active >= total && total > 0) setActive(0);
  }, [active, total]);

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
  }, [goNext, goPrevious]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
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
            >
              {carouselEvents.map((event, index) => {
                const offset = circularOffset(index, active, total);
                if (Math.abs(offset) > MAX_VISIBLE_OFFSET) return null;

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
                        setDirectionIndicator(offset < 0 ? -1 : 1);
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
