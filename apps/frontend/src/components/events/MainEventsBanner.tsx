'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './events-runtime.module.css';

function circularOffset(idx: number, active: number, total: number): number {
  const distance = (idx - active + total) % total;
  return distance > Math.floor(total / 2) ? distance - total : distance;
}

function getCardStyle(offset: number, compact: boolean): React.CSSProperties {
  const base = compact
    ? { width: 214, height: 270, marginLeft: -107, marginTop: -135 }
    : { width: 346, height: 347, marginLeft: -173, marginTop: -173.5 };

  if (offset === 0) {
    return { ...base, transform: 'translateX(0) scale(1)', zIndex: 5, opacity: 1 };
  }

  const abs = Math.abs(offset);
  const direction = offset > 0 ? 1 : -1;

  if (abs === 1) {
    return {
      ...base,
      transform: `translateX(${direction * (compact ? 128 : 278)}px) scale(0.88)`,
      zIndex: 4,
      opacity: 1,
    };
  }

  if (abs === 2) {
    return {
      ...base,
      transform: `translateX(${direction * (compact ? 226 : 505)}px) scale(0.73)`,
      zIndex: 3,
      opacity: 1,
    };
  }

  return {
    ...base,
    transform: `translateX(${direction * (compact ? 340 : 720)}px) scale(0.6)`,
    zIndex: 1,
    opacity: 0,
  };
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
    <section id="main-events" className={styles.mainEventsSection} aria-label="Главные события">
      <div className={styles.mainEventsOuter}>
        <h2 className={styles.mainEventsTitle}>Главные события</h2>
        {!total ? (
          <div className={styles.mainEmpty} role="status"><p>Нет событий</p></div>
        ) : (
          <>
            <div ref={galleryRef} className={styles.carouselGallery} tabIndex={0} aria-label="Карусель главных событий">
              {events.map((event, index) => {
                const offset = circularOffset(index, active, total);
                if (Math.abs(offset) > 2) return null;

                const image = event.images?.[0];
                const imageUrl = image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl ?? image?.thumbnailUrl;
                const isCenter = offset === 0;

                return (
                  <button
                    type="button"
                    key={event.id}
                    className={styles.carouselCard}
                    style={getCardStyle(offset, compact)}
                    aria-hidden={!isCenter}
                    tabIndex={isCenter ? 0 : -1}
                    aria-label={isCenter ? `Открыть событие: ${event.title}` : `Показать событие: ${event.title}`}
                    onClick={() => isCenter ? openEvent(event) : goTo(index)}
                  >
                    <span className={styles.carouselCardFrame}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={event.title}
                          fill
                          unoptimized
                          loading="lazy"
                          sizes={compact ? '214px' : '346px'}
                          className={styles.carouselImage}
                        />
                      ) : (
                        <span className={styles.carouselPlaceholder} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {total > 1 && (
              <nav className={styles.carouselNav} aria-label="Навигация по главным событиям">
                <button type="button" onClick={() => goTo(active - 1)} className={styles.carouselNavButton} aria-label="Предыдущее событие">‹</button>
                {Array.from({ length: indicatorCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToIndicator(index)}
                    aria-label={`Группа событий ${index + 1}`}
                    aria-current={index === activeIndicator ? 'true' : undefined}
                    className={cn(styles.carouselDot, index === activeIndicator && styles.carouselDotActive)}
                  />
                ))}
                <button type="button" onClick={() => goTo(active + 1)} className={styles.carouselNavButton} aria-label="Следующее событие">›</button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
