import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatEventDateParts } from '@/lib/format';
import type { PublicEvent } from '@/types/event';

const CARD_BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0IiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=';

interface EventCardProps {
  event: PublicEvent;
  className?: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  LIVE: { label: 'Идёт сейчас', className: 'bg-live-status text-primary' },
  COMPLETED: { label: 'Завершено', className: 'bg-completed-status text-white' },
  PLANNED: { label: 'Запланировано', className: 'bg-green-marker/90 text-white' },
};

export function EventCard({ event, className }: EventCardProps) {
  const image = event.images?.[0];
  const imgUrl = image?.eventCardUrl ?? image?.thumbnailUrl ?? image?.originalUrl;
  const dateParts = formatEventDateParts(event.startDate);
  const status = STATUS_LABEL[event.autoStatus];

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'group block rounded-2xl overflow-hidden bg-white shadow-base',
        'border border-dropdown-border hover:border-primary/20',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2',
        className,
      )}
      aria-label={`Перейти к мероприятию: ${event.title}`}
    >
      {/* Image area */}
      <div className="relative aspect-[16/9] bg-primary/5 overflow-hidden">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            placeholder="blur"
            blurDataURL={CARD_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-primary/20 text-4xl font-bold">АБ</span>
          </div>
        )}

        {/* Status badge — top left */}
        {status.label && (
          <span
            className={cn(
              'absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full',
              status.className,
            )}
            style={{ fontFamily: 'var(--font-gilroy), sans-serif' }}
          >
            {status.label}
          </span>
        )}

        {/* Date badge — bottom left overlay */}
        <div className="absolute bottom-3 left-3 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center w-[60px] py-2 leading-none">
          <span
            className="font-bold text-primary text-2xl leading-none"
            style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}
          >
            {dateParts.day}
          </span>
          <span
            className="font-bold text-primary text-[11px] leading-none mt-0.5 lowercase"
            style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}
          >
            {dateParts.month}
          </span>
        </div>
      </div>

      {/* Card body — title + CTA only */}
      <div className="p-4 tablet:p-5 flex flex-col gap-3">
        <h3
          className="font-bold text-primary text-sm tablet:text-base leading-snug line-clamp-3 uppercase group-hover:text-selected-day transition-colors"
          style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}
        >
          {event.title}
        </h3>

        <div className="mt-auto flex justify-end">
          <span className="pub-event-card-cta">
            Подробнее →
          </span>
        </div>
      </div>
    </Link>
  );
}
