'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './main-events-carousel.module.css';

function circularOffset(idx: number, active: number, total: number): number {
  const distance = (idx - active + total) % total;
  return distance > Math.floor(total / 2) ? distance - total : distance;
}

function getCardStyle(offset: number, compact: boolean): React.CSSProperties {
  const size = compact ? 270 : 347;
  const abs = Math.abs(offset);
  const direction = offset > 0 ? 1 : -1;

  let translateX = 0;
  let scale = 1;
  let zIndex = 5;
  let opacity = 1;

  if (abs === 1) {
    translateX = direction * (compact ? 150 : 300);
    scale = 0.88;
    zIndex = 4;
  } else if (abs === 2) {
    translateX = direction * (compact ? 258 : 535);
    scale = 0.73;
    zIndex = 3;
  } else if (abs > 2) {
    translateX = direction * (compact ? 360 : 760);
    scale = 0.6;
    zIndex = 1;
    opacity = 0;
  }

  return {
    '--poster-size': `${size}px`,
    transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`,
    zIndex,
    opacity,
  } as React.CSSProperties;
}

interface MainEventsBannerProps { events: PublicEvent[]; }

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const { openEvent } = useEventModal();
  const [active, setActive] = useState(0);
  const [compact, setCompact] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const total = events.length;
  const indicatorCount = Math.min(3, total);
  const activeIndicator = total > 0
    ? Math.min(indicatorCount - 1, Math.floor((active * indicatorCount) / total))
    : 0;

  const goTo = useCallback((index: number) => {
    if (!total) return;
    setActive(((index % total) + total) % total);
  }, [total]);

  const goToIndicator = useCallback((indicator: number) => {
    if (!indicatorCount) return;
    goTo(Math.floor((indicator * total) / indicatorCount));
  }, [goTo, indicatorCount, total]);

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

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !total) return;

    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'ArrowLeft') {
        keyboardEvent.preventDefault();
        goTo(active - 1);
      }
      if (keyboardEvent.key === 'ArrowRight') {
        keyboardEvent.preventDefault();
        goTo(active + 1);
      }
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        openEvent(events[active]);
      }
    };

    gallery.addEventListener('keydown', onKeyDown);
    return () => gallery.removeEventListener('keydown', onKeyDown);
  }, [active, events, goTo, openEvent, total]);

  return (
    <section id="main-events" className={styles.section} aria-label="Главные события">
      <div className={styles.outer}>
        <h2 className={styles.title}>Главные события</h2>
        {!total ? (
          <div className={styles.empty} role="status"><p>Нет событий</p></div>
        ) : (
          <>
            <div ref={galleryRef} className={styles.gallery} tabIndex={0} aria-label="Карусель главных событий">
              {events.map((event, index) => {
                const offset = circularOffset(index, active, total);
                if (Math.abs(offset) > 2) return null;

                const image = event.images?.[0];
                const imageUrl = image?.mainEventUrl ?? image?.originalUrl ?? image?.eventCardUrl ?? image?.thumbnailUrl;
                const isCenter = offset === 0;

                return (
                  <button
                    type="button"
                    key={event.id}
                    className={styles.card}
                    style={getCardStyle(offset, compact)}
                    aria-hidden={!isCenter}
                    tabIndex={isCenter ? 0 : -1}
                    aria-label={isCenter ? `Открыть событие: ${event.title}` : `Показать событие: ${event.title}`}
                    onClick={() => isCenter ? openEvent(event) : goTo(index)}
                  >
                    <span className={styles.frame}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={event.title}
                          loading="lazy"
                          className={styles.poster}
                        />
                      ) : (
                        <span className={styles.placeholder} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {total > 1 && (
              <nav className={styles.nav} aria-label="Навигация по главным событиям">
                <button type="button" onClick={() => goTo(active - 1)} className={styles.navButton} aria-label="Предыдущее событие">‹</button>
                {Array.from({ length: indicatorCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToIndicator(index)}
                    aria-label={`Группа событий ${index + 1}`}
                    aria-current={index === activeIndicator ? 'true' : undefined}
                    className={cn(styles.dot, index === activeIndicator && styles.dotActive)}
                  />
                ))}
                <button type="button" onClick={() => goTo(active + 1)} className={styles.navButton} aria-label="Следующее событие">›</button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
