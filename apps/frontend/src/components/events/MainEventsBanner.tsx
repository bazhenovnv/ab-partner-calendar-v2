'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatFormat } from '@/lib/format';
import type { PublicEvent } from '@/types/event';

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0Ii8+PC9zdmc+';

const VISIBLE_DESKTOP = 4;
const VISIBLE_MOBILE = 2;

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const [start, setStart] = useState(0);

  const total = events.length;

  const goTo = useCallback(
    (i: number) => setStart(Math.max(0, Math.min(i, Math.max(0, total - VISIBLE_DESKTOP)))),
    [total],
  );

  if (!total) return null;

  const maxStart = Math.max(0, total - VISIBLE_DESKTOP);
  const visibleSlice = events.slice(start, start + VISIBLE_DESKTOP);

  return (
    <section
      className="bg-primary py-8 tablet:py-10"
      aria-label="Главные события"
      aria-roledescription="carousel"
    >
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8">
        <h2 className="font-montserrat font-bold text-white text-2xl tablet:text-3xl mb-5">
          Главные события
        </h2>

        {/* Thumbnail grid — 2 columns mobile, 4 desktop */}
        <div
          className="grid grid-cols-2 tablet:grid-cols-4 gap-3 tablet:gap-4"
          aria-live="polite"
          aria-atomic="true"
        >
          {visibleSlice.map((event, idx) => {
            const image = event.images?.[0];
            const imgUrl =
              image?.thumbnailUrl ?? image?.eventCardUrl ?? image?.originalUrl;
            const formatLabel = formatFormat(event.format);

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group relative rounded-xl overflow-hidden bg-selected-day/30 aspect-[4/3] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                aria-label={`${formatLabel}: ${event.title}`}
                tabIndex={idx === 0 ? 0 : -1}
              >
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={event.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDER}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-selected-day/40 to-primary" />
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/55 to-primary/25" />

                {/* Content */}
                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
                    {formatLabel}
                  </span>
                  <h3 className="font-montserrat font-bold text-white text-xs tablet:text-sm leading-snug line-clamp-3 uppercase group-hover:text-mint transition-colors">
                    {event.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Navigation dots */}
        {total > VISIBLE_DESKTOP && (
          <div
            className="flex items-center justify-center gap-2 mt-5"
            role="tablist"
            aria-label="Навигация по главным событиям"
          >
            <button
              type="button"
              onClick={() => goTo(start - 1)}
              disabled={start === 0}
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-xl leading-none select-none"
              aria-label="Предыдущие события"
            >
              ‹
            </button>

            {Array.from({ length: maxStart + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                onClick={() => goTo(i)}
                aria-label={`Страница ${i + 1}`}
                aria-selected={i === start}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === start
                    ? 'bg-mint w-5'
                    : 'bg-white/30 hover:bg-white/60 w-2',
                )}
              />
            ))}

            <button
              type="button"
              onClick={() => goTo(start + 1)}
              disabled={start === maxStart}
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-xl leading-none select-none"
              aria-label="Следующие события"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
