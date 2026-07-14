'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjY4IiBoZWlnaHQ9IjM5NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0Ii8+PC9zdmc+';

function circularOffset(idx: number, active: number, total: number): number {
  const d = ((idx - active + total) % total);
  return d > Math.floor(total / 2) ? d - total : d;
}

/** Approved Figma fan: wider cards, shallower rotation and balanced overlap. */
function getCardStyle(offset: number): React.CSSProperties {
  if (offset === 0) {
    return { transform: 'translateX(0) scale(1) rotateY(0deg)', zIndex: 5, opacity: 1 };
  }
  const abs = Math.abs(offset);
  const dir = offset > 0 ? 1 : -1;
  if (abs === 1) {
    return {
      transform: `translateX(${dir * 255}px) scale(0.88) rotateY(${-dir * 12}deg)`,
      zIndex: 4,
      opacity: 0.98,
    };
  }
  if (abs === 2) {
    return {
      transform: `translateX(${dir * 470}px) scale(0.72) rotateY(${-dir * 20}deg)`,
      zIndex: 3,
      opacity: 0.92,
    };
  }
  return { transform: `translateX(${dir * 650}px) scale(0.54) rotateY(${-dir * 28}deg)`, zIndex: 1, opacity: 0 };
}

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const [active, setActive] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const total = events.length;

  const goTo = useCallback(
    (i: number) => setActive(((i % total) + total) % total),
    [total],
  );

  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  if (!total) return null;

  return (
    <section className="pub-main-events-section" aria-label="Главные события">
      <div className="pub-main-events-outer">
        <h2 className="pub-main-events-title">Главные события</h2>
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
                style={getCardStyle(offset)}
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
                      loading="lazy"
                      sizes="320px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
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
            {events.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Событие ${i + 1}`}
                aria-current={i === active ? 'true' : undefined}
                className={cn('pub-carousel-dot', i === active && 'pub-carousel-dot--active')}
              />
            ))}
            <button type="button" onClick={() => goTo(active + 1)} className="pub-carousel-nav-btn" aria-label="Следующее событие">›</button>
          </nav>
        )}
      </div>
    </section>
  );
}
