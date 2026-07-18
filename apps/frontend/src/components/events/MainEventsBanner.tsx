'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './main-events-carousel.module.css';

const MAX_VISIBLE_OFFSET = 2;
const SWIPE_THRESHOLD_PX = 44;

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
  [-2]: { translateX: -520, translateY: 34, translateZ: -250, rotateY: 32, rotateZ: -4.5, scale: 0.74, opacity: 0.82, brightness: 0.78, zIndex: 1 },
  [-1]: { translateX: -286, translateY: 12, translateZ: -105, rotateY: 20, rotateZ: -2.2, scale: 0.9, opacity: 0.94, brightness: 0.9, zIndex: 3 },
  [0]: { translateX: 0, translateY: 0, translateZ: 40, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, brightness: 1, zIndex: 5 },
  [1]: { translateX: 286, translateY: 12, translateZ: -105, rotateY: -20, rotateZ: 2.2, scale: 0.9, opacity: 0.94, brightness: 0.9, zIndex: 3 },
  [2]: { translateX: 520, translateY: 34, translateZ: -250, rotateY: -32, rotateZ: 4.5, scale: 0.74, opacity: 0.82, brightness: 0.78, zIndex: 1 },
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
  const [compact, setCompact] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const total = carouselEvents.length;

  const goTo = useCallback((index: number) => {
    if (!total) return;
    setActive(((index % total) + total) % total);
  }, [total]);

  const goPrevious = useCallback(() => goTo(active - 1), [active, goTo]);
  const goNext = useCallback(() => goTo(active + 1), [active, goTo]);

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
    if (startX !== null && typeof clientX === 'number') {
      const delta = clientX - startX;
      if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
        delta > 0 ? goPrevious() : goNext();
      }
    }

    pointerStartXRef.current = null;
    pointerIdRef.current = null;
    setDragOffset(0);
  }, [goNext, goPrevious]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartXRef.current === null || pointerIdRef.current !== event.pointerId) return;
    const delta = event.clientX - pointerStartXRef.current;
    setDragOffset(Math.max(-72, Math.min(72, delta)));
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
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
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
                    onClick={() => (isCenter ? openEvent(event) : goTo(index))}
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
                      <span className={styles.sheen} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>

            {total > 1 && (
              <nav className={styles.nav} aria-label="Навигация по главным событиям">
                <button type="button" onClick={goPrevious} className={styles.navButton} aria-label="Предыдущее событие">‹</button>
                <div className={styles.dots} role="group" aria-label="Выбор события">
                  {carouselEvents.map((event, index) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => goTo(index)}
                      aria-label={`Событие ${index + 1}: ${event.title}`}
                      aria-current={index === active ? 'true' : undefined}
                      className={cn(styles.dot, index === active && styles.dotActive)}
                    />
                  ))}
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
