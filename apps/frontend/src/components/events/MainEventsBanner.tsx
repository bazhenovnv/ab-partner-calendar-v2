'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';

function circularOffset(idx: number, active: number, total: number): number {
  const d = ((idx - active + total) % total);
  return d > Math.floor(total / 2) ? d - total : d;
}

function getCardStyle(offset: number, compact: boolean): React.CSSProperties {
  const size = compact ? { width: 200, height: 295, marginLeft: -100, marginTop: -147.5 } : {
    width: 427.25,
    height: 427.25,
    marginLeft: -213.625,
    marginTop: -213.625,
  };

  if (offset === 0) {
    return { ...size, transform: 'translateX(0) scale(1)', zIndex: 5, opacity: 1 };
  }

  const abs = Math.abs(offset);
  const dir = offset > 0 ? 1 : -1;

  if (abs === 1) {
    return {
      ...size,
      transform: `translateX(${dir * (compact ? 125 : 260)}px) scale(0.86476)`,
      zIndex: 4,
      opacity: 1,
    };
  }

  if (abs === 2) {
    return {
      ...size,
      transform: `translateX(${dir * (compact ? 230 : 485)}px) scale(0.72349, 0.71920)`,
      zIndex: 3,
      opacity: 1,
    };
  }

  return {
    ...size,
    transform: `translateX(${dir * (compact ? 340 : 700)}px) scale(0.6)`,
    zIndex: 1,
    opacity: 0,
  };
}

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const [active, setActive] = useState(0);
  const [compact, setCompact] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const total = events.length;
  const indicatorCount = Math.min(3, total);
  const activeIndicator = total > 0
    ? Math.min(indicatorCount - 1, Math.floor((active * indicatorCount) / total))
    : 0;

  const goTo = useCallback(
    (i: number) => {
      if (!total) return;
      setActive(((i % total) + total) % total);
    },
    [total],
  );

  const goToIndicator = useCallback(
    (indicator: number) => {
      if (!indicatorCount) return;
      const eventIndex = Math.floor((indicator * total) / indicatorCount);
      goTo(eventIndex);
    },
    [goTo, indicatorCount, total],
  );

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
    const el = galleryRef.current;
    if (!el || !total) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [active, goTo, total]);

  return (
    <section id="main-events" className="pub-main-events-section" aria-label="Главные события">
      <div className="pub-main-events-outer">
        <h2 className="pub-main-events-title">Главные события</h2>

        {!total ? (
          <div className="flex min-h-[260px] items-center justify-center text-center text-primary/45">
            <p className="font-montserrat text-lg font-semibold">Нет событий</p>
          </div>
        ) : (
          <>
            <div
              ref={galleryRef}
              className="pub-carousel-gallery"
              aria-live="polite"
              aria-atomic="true"
              tabIndex={0}
              aria-label="Карусель главных событий"
            >
              {events.map((event, idx) => {
                const offset = circularOffset(idx, active, total);
                if (Math.abs(offset) > 2) return null;

                const image = event.images?.[0];
                const imgUrl = image?.mainEventUrl ?? image?.thumbnailUrl ?? image?.eventCardUrl ?? image?.originalUrl;
                const isCenter = offset === 0;

                return (
                  <div
                    key={event.id}
                    className="pub-carousel-card"
                    style={getCardStyle(offset, compact)}
                    aria-hidden={!isCenter}
                    onClick={!isCenter ? () => goTo(idx) : undefined}
                  >
                    <Link
                      href={`/events/${event.id}`}
                      className="pub-carousel-card-link"
                      tabIndex={isCenter ? 0 : -1}
                      aria-label={event.title}
                      onClick={!isCenter ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                    >
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={event.title}
                          fill
                          unoptimized
                          loading="lazy"
                          sizes={compact ? '200px' : '427px'}
                          className="object-cover object-center"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-selected-day/40 to-primary" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/88 via-primary/22 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="font-montserrat font-bold text-white text-sm leading-snug line-clamp-3">
                          {event.title}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {total > 1 && (
              <nav className="pub-carousel-nav" aria-label="Навигация по главным событиям">
                <button type="button" onClick={() => goTo(active - 1)} className="pub-carousel-nav-btn" aria-label="Предыдущее событие">‹</button>
                {Array.from({ length: indicatorCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToIndicator(i)}
                    aria-label={`Группа событий ${i + 1}`}
                    aria-current={i === activeIndicator ? 'true' : undefined}
                    className={cn('pub-carousel-dot', i === activeIndicator && 'pub-carousel-dot--active')}
                    style={{ width: 8, height: 8, borderRadius: '50%' }}
                  />
                ))}
                <button type="button" onClick={() => goTo(active + 1)} className="pub-carousel-nav-btn" aria-label="Следующее событие">›</button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
