'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatEventDateParts } from '@/lib/format';
import type { PublicEvent } from '@/types/event';
import { useEventModal } from './EventModalProvider';
import styles from './events-runtime.module.css';
import ui from './event-interactions.module.css';

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
  const actionLabel = event.ticketSalesEnabled ? 'Купить билет' : 'Участвовать';
  const actionUrl = event.ticketSalesEnabled ? event.ticketUrl : event.eventUrl;

  return (
    <article className={cn(styles.eventCard, ui.cardShell, 'group', className)}>
      <button
        type="button"
        className={ui.cardOpen}
        aria-label={`Открыть мероприятие: ${event.title}`}
        onClick={() => openEvent(event)}
      >
        <span className={cn(styles.eventCardMedia, ui.cardMedia)}>
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
            <span className="pub-event-card-placeholder" aria-hidden="true"><span>АБ</span></span>
          )}
          <span className={cn('pub-event-card-status', status.className)}>{status.label}</span>
        </span>

        <span className={cn(styles.infoPanel, ui.cardInfo)}>
          <span className={styles.dateBadge} aria-label={`${dateParts.day} ${dateParts.month}`}>
            <span className={styles.dateDay}>{dateParts.day}</span>
            <span className={styles.dateMonth}>{dateParts.month}</span>
          </span>
          <span className={cn(styles.eventBody, ui.cardBody)}>
            <span className={cn(styles.eventTitle, ui.cardTitle)}>{event.title}</span>
            {event.speaker && <strong className={ui.cardSpeaker}>Спикер: {event.speaker}</strong>}
            <span className={ui.cardDetails}>Подробнее →</span>
          </span>
        </span>
      </button>

      {actionUrl ? (
        <a
          href={actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={ui.cardAction}
          aria-label={`${actionLabel}: ${event.title}`}
        >
          {actionLabel}
        </a>
      ) : (
        <span className={cn(ui.cardAction, ui.cardActionDisabled)} aria-disabled="true">
          {actionLabel}
        </span>
      )}
    </article>
  );
}
