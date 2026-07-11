'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjY4IiBoZWlnaHQ9IjM5NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0Ii8+PC9zdmc+';

// Carousel card transform: offset is position relative to active center (-2, -1, 0, +1, +2)
function getCardStyle(offset: number): React.CSSProperties {
  if (offset === 0) {
    return { transform: 'translateX(0) scale(1) rotate(0deg)', zIndex: 5, opacity: 1 };
  }
  const abs = Math.abs(offset);
  const dir = offset > 0 ? 1 : -1;
  if (abs === 1) {
    return {
      transform: `translateX(${dir * 310}px) scale(0.82) rotate(${dir * 5}deg)`,
      zIndex: 4,
      opacity: 1,
    };
  }
  if (abs === 2) {
    return {
      transform: `translateX(${dir * 545}px) scale(0.68) rotate(${dir * 11}deg)`,
      zIndex: 3,
      opacity: 0.7,
    };
  }
  return { transform: `translateX(${dir * 700}px) scale(0.5) rotate(${dir * 15}deg)`, zIndex: 1, opacity: 0 };
}

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const [active, setActive] = useState(0);

  const total = events.length;

  const goTo = useCallback(
    (i: number) => setActive(Math.max(0, Math.min(i, total - 1))),
    [total],
  );

  if (!total) return null;

  return (
    <section className="pub-main-events-section" aria-label="Главные события">
      <div className="pub-main-events-outer">
        <h2 className="pub-main-events-title">Главные события</h2>

        {/* Fan/perspective carousel gallery */}
        <div
          className="pub-carousel-gallery"
          aria-live="polite"
          aria-atomic="true"
        >
          {events.map((event, idx) => {
            const offset = idx - active;
            if (Math.abs(offset) > 2) return null;

            const image = event.images?.[0];
            const imgUrl =
              image?.thumbnailUrl ?? image?.eventCardUrl ?? image?.originalUrl;

            return (
              <div
                key={event.id}
                className="pub-carousel-card"
                style={getCardStyle(offset)}
                aria-hidden={offset !== 0}
              >
                <Link
                  href={`/events/${event.id}`}
                  className="pub-carousel-card-link"
                  tabIndex={offset === 0 ? 0 : -1}
                  aria-label={event.title}
                >
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={event.title}
                      fill
                      loading="lazy"
                      sizes="268px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-selected-day/40 to-primary" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
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

        {/* Navigation */}
        {total > 1 && (
          <nav className="pub-carousel-nav" aria-label="Навигация по главным событиям">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="pub-carousel-nav-btn"
              aria-label="Предыдущее событие"
            >
              ‹
            </button>

            {events.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Событие ${i + 1}`}
                aria-current={i === active ? 'true' : undefined}
                className={cn(
                  'pub-carousel-dot',
                  i === active && 'pub-carousel-dot--active',
                )}
              />
            ))}

            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === total - 1}
              className="pub-carousel-nav-btn"
              aria-label="Следующее событие"
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
