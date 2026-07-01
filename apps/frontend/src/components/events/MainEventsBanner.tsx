'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatEventDate, formatFormat } from '@/lib/format';
import type { PublicEvent } from '@/types/event';

interface MainEventsBannerProps {
  events: PublicEvent[];
}

export function MainEventsBanner({ events }: MainEventsBannerProps) {
  const [current, setCurrent] = useState(0);

  if (!events.length) return null;

  const event = events[current];
  const image = event.images?.[0];
  const imgUrl = image?.mainEventUrl ?? image?.eventCardUrl ?? image?.originalUrl;
  const cityLabel = event.city?.name ?? event.cityName;

  return (
    <section
      className="relative w-full bg-primary overflow-hidden"
      style={{ minHeight: '360px' }}
      aria-label="Главные мероприятия"
    >
      <div className="relative aspect-[21/9] max-h-[520px] min-h-[280px] tablet:min-h-[360px]">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-selected-day" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 tablet:p-10 desktop:p-14 max-w-[900px]">
          <div className="flex flex-wrap gap-2 mb-3">
            {event.directions.slice(0, 2).map((d) => (
              <span
                key={d.direction.slug}
                className="text-xs bg-mint/20 text-mint px-3 py-1 rounded-full font-medium"
              >
                {d.direction.name}
              </span>
            ))}
            <span className="text-xs bg-white/10 text-white/80 px-3 py-1 rounded-full">
              {formatFormat(event.format)}
              {cityLabel && event.format === 'OFFLINE' ? ` · ${cityLabel}` : ''}
            </span>
          </div>

          <h2 className="font-montserrat font-bold text-white text-2xl tablet:text-3xl desktop:text-4xl leading-tight mb-2 line-clamp-3">
            {event.title}
          </h2>

          <p className="text-white/70 text-sm tablet:text-base mb-4">
            {formatEventDate(event.startDate, event.endDate)}
            {event.startTime && <span> · {event.startTime} МСК</span>}
          </p>

          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-2 bg-mint text-primary font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-mint/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Подробнее
          </Link>
        </div>
      </div>

      {events.length > 1 && (
        <div className="absolute bottom-4 right-6 tablet:bottom-6 tablet:right-10 flex gap-2">
          {events.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Перейти к мероприятию ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                i === current ? 'bg-mint w-5' : 'bg-white/40 hover:bg-white/70',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
