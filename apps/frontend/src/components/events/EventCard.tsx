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
  LIVE: { label: 'Идёт сейчас', className: 'pub-event-card-status--live' },
  COMPLETED: { label: 'Завершено', className: 'pub-event-card-status--completed' },
  PLANNED: { label: 'Запланировано', className: 'pub-event-card-status--planned' },
};

export function EventCard({ event, className }: EventCardProps) {
  const image = event.images?.[0];
  const imgUrl = image?.eventCardUrl ?? image?.thumbnailUrl ?? image?.originalUrl;
  const dateParts = formatEventDateParts(event.startDate);
  const status = STATUS_LABEL[event.autoStatus] ?? null;

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn('pub-event-card group', className)}
      aria-label={`Перейти к мероприятию: ${event.title}`}
    >
      <div className="pub-event-card-media">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            loading="lazy"
            sizes="(max-width: 767px) 100vw, (max-width: 1439px) 50vw, 428px"
            className="pub-event-card-image"
            placeholder="blur"
            blurDataURL={CARD_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="pub-event-card-placeholder" aria-hidden="true">
            <span>АБ</span>
          </div>
        )}

        {status?.label && (
          <span className={cn('pub-event-card-status', status.className)}>
            {status.label}
          </span>
        )}
      </div>

      <div className="pub-event-card-date" aria-label={`${dateParts.day} ${dateParts.month}`}>
        <span className="pub-event-card-date-day">{dateParts.day}</span>
        <span className="pub-event-card-date-month">{dateParts.month}</span>
      </div>

      <div className="pub-event-card-body">
        <h3 className="pub-event-card-title">{event.title}</h3>
        <span className="pub-event-card-cta">Подробнее →</span>
      </div>
    </Link>
  );
}
