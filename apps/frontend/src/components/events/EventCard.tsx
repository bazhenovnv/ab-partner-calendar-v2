'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatEventDateParts } from '@/lib/format';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './events-runtime.module.css';

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
      className={cn(styles.eventCard, 'group', className)}
      aria-label={`Открыть мероприятие: ${event.title}`}
      onClick={() => openEvent(event)}
    >
      <div className={styles.eventCardMedia}>
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            unoptimized
            loading="lazy"
            sizes="(max-width: 767px) 100vw, (max-width: 1439px) 50vw, 428px"
            className={styles.eventCardImage}
          />
        ) : (
          <div className="pub-event-card-placeholder" aria-hidden="true"><span>АБ</span></div>
        )}
        <span className={cn('pub-event-card-status', status.className)}>{status.label}</span>
      </div>

      <div className={styles.infoPanel}>
        <div className={styles.dateBadge} aria-label={`${dateParts.day} ${dateParts.month}`}>
          <span className={styles.dateDay}>{dateParts.day}</span>
          <span className={styles.dateMonth}>{dateParts.month}</span>
        </div>
        <div className={styles.eventBody}>
          <h3 className={styles.eventTitle}>{event.title}</h3>
          {event.speaker && <p className={styles.eventSpeaker}><strong>Спикер: {event.speaker}</strong></p>}
          <span className={styles.eventCta}>Подробнее →</span>
        </div>
      </div>
    </button>
  );
}
