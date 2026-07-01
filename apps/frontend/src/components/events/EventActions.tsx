'use client';

import { generateIcs, downloadIcs } from '@/lib/ics';
import type { PublicEvent } from '@/types/event';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

interface EventActionsProps {
  event: PublicEvent;
}

export function EventActions({ event }: EventActionsProps) {
  const registrationUrl = event.ticketUrl ?? event.eventUrl;
  const reminderUrl = BOT_USERNAME
    ? `https://t.me/${BOT_USERNAME}?start=reminder_${event.id}`
    : null;

  const handleIcsDownload = () => {
    const locationParts = [event.venue, event.address].filter(Boolean);
    const ics = generateIcs({
      id: event.id,
      title: event.title,
      description: event.shortDescription,
      startDate: event.startDate,
      endDate: event.endDate,
      url: registrationUrl,
      location: locationParts.length > 0 ? locationParts.join(', ') : null,
    });
    const slug = event.title.toLowerCase().replace(/[^а-яa-z0-9]+/gi, '-').slice(0, 40);
    downloadIcs(ics, `${slug}.ics`);
  };

  return (
    <div className="flex flex-col mobile:flex-row flex-wrap gap-3" role="group" aria-label="Действия с мероприятием">
      {registrationUrl && (
        <a
          href={registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-mint text-primary font-semibold px-6 py-3 rounded-xl text-sm hover:bg-mint/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
        >
          {event.ticketSalesEnabled ? 'Купить билет' : 'Зарегистрироваться'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}

      {reminderUrl && (
        <a
          href={reminderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-primary/5 border border-primary/15 text-primary font-medium px-6 py-3 rounded-xl text-sm hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Напомнить в Telegram
        </a>
      )}

      <button
        type="button"
        onClick={handleIcsDownload}
        className="inline-flex items-center justify-center gap-2 bg-primary/5 border border-primary/15 text-primary font-medium px-6 py-3 rounded-xl text-sm hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Добавить мероприятие в календарь (скачать ICS)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        В календарь
      </button>
    </div>
  );
}
