'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatEventDateParts } from '@/lib/format';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';

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
  const { openEvent } = useEventModal();
  const image = event.images?.[0];
  const imgUrl = image?.eventCardUrl ?? image?.thumbnailUrl ?? image?.originalUrl;
  const dateParts = formatEventDateParts(event.startDate);
  const status = STATUS_LABEL[event.autoStatus] ?? STATUS_LABEL.PLANNED;

  return (
    <button
      type="button"
      className={cn('pub-event-card group', className)}
      aria-label={`Открыть мероприятие: ${event.title}`}
      onClick={() => openEvent(event)}
    >
      <div className="pub-event-card-media">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            unoptimized
            loading="lazy"
            sizes="(max-width: 767px) 100vw, (max-width: 1439px) 50vw, 428px"
            className="pub-event-card-image"
          />
        ) : (
          <div className="pub-event-card-placeholder" aria-hidden="true"><span>АБ</span></div>
        )}
        <span className={cn('pub-event-card-status', status.className)}>{status.label}</span>
      </div>

      <div className="pub-event-card-info-panel">
        <div className="pub-event-card-date" aria-label={`${dateParts.day} ${dateParts.month}`}>
          <span className="pub-event-card-date-day">{dateParts.day}</span>
          <span className="pub-event-card-date-month">{dateParts.month}</span>
        </div>
        <div className="pub-event-card-body">
          <h3 className="pub-event-card-title">{event.title}</h3>
          {event.speaker && <p className="pub-event-card-speaker">Спикер: {event.speaker}</p>}
          <span className="pub-event-card-cta">Подробнее →</span>
        </div>
      </div>
    </button>
  );
}
