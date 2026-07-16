'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatEventDate, formatFormat } from '@/lib/format';
import type { PublicEvent } from '@/types/event';

interface MainEventsBannerProps {
  events: PublicEvent[];
}

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQ4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwRDIzNDQiLz48L3N2Zz4=';

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      if (events.length === 0) return;
      setCurrent(((index % events.length) + events.length) % events.length);
    },
    [events.length],
  );

  if (!events.length) {
    return (
      <section
        className="flex min-h-[280px] w-full items-center justify-center bg-primary px-6 text-center text-white tablet:min-h-[360px]"
        aria-label="Главные мероприятия"
      >
        <div>
          <h2 className="font-montserrat text-2xl font-bold tablet:text-3xl">
            Главные мероприятия
          </h2>
          <p className="mt-3 text-sm text-white/70 tablet:text-base">
            Архив мероприятий загружается. Блок появится автоматически после синхронизации данных.
          </p>
        </div>
      </section>
    );
  }

  const safeCurrent = current >= events.length ? 0 : current;
  const event = events[safeCurrent];
  const image = event.images?.[0];
  const imgUrl = image?.mainEventUrl ?? image?.eventCardUrl ?? image?.originalUrl;
  const cityLabel = event.city?.name ?? event.cityName;
  const directions = event.directions ?? [];

  return (
    <section
      className="relative w-full overflow-hidden bg-primary"
      style={{ minHeight: '360px' }}
      aria-label="Главные мероприятия"
      aria-roledescription="carousel"
    >
      <div
        className="relative min-h-[360px] tablet:min-h-[430px] desktop:min-h-[520px]"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Мероприятие ${safeCurrent + 1} из ${events.length}: ${event.title}`}
      >
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-contain object-center transition-opacity duration-500"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary to-selected-day" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/35 to-primary/10" />

        <div className="absolute bottom-0 left-0 right-0 max-w-[900px] p-6 tablet:p-10 desktop:p-14">
          <div className="mb-3 flex flex-wrap gap-2">
            {directions.slice(0, 2).map((direction) => (
              <span
                key={direction.direction.slug}
                className="rounded-full bg-mint/20 px-3 py-1 text-xs font-medium text-mint"
              >
                {direction.direction.name}
              </span>
            ))}
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {formatFormat(event.format)}
              {cityLabel && event.format === 'OFFLINE' ? ` · ${cityLabel}` : ''}
            </span>
          </div>

          <h2 className="mb-2 line-clamp-3 font-montserrat text-2xl font-bold leading-tight text-white tablet:text-3xl desktop:text-4xl">
            {event.title}
          </h2>

          <p className="mb-4 text-sm text-white/70 tablet:text-base">
            {formatEventDate(event.startDate, event.endDate)}
            {event.startTime && <span> · {event.startTime} МСК</span>}
          </p>

          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-mint px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-mint/90 active:bg-mint/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Подробнее
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 7h8M8 3.5l3.5 3.5L8 10.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>

      {events.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(safeCurrent - 1)}
            aria-label="Предыдущее мероприятие"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary/70 text-white backdrop-blur-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white tablet:left-6"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => goTo(safeCurrent + 1)}
            aria-label="Следующее мероприятие"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary/70 text-white backdrop-blur-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white tablet:right-6"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            className="absolute bottom-4 right-6 flex gap-2 tablet:bottom-6 tablet:right-10"
            role="tablist"
            aria-label="Навигация по мероприятиям"
          >
            {events.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                onClick={() => goTo(index)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === 'ArrowRight') goTo(index + 1);
                  if (keyboardEvent.key === 'ArrowLeft') goTo(index - 1);
                }}
                aria-label={`Мероприятие ${index + 1}: ${item.title}`}
                aria-selected={index === safeCurrent}
                tabIndex={index === safeCurrent ? 0 : -1}
                className={cn(
                  'relative flex h-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  index === safeCurrent ? 'w-8' : 'w-6',
                )}
              >
                <span
                  className={cn(
                    'block h-2 rounded-full transition-all duration-300',
                    index === safeCurrent
                      ? 'w-5 scale-100 bg-mint'
                      : 'w-2 bg-white/40 hover:bg-white/70 active:bg-white/90',
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
