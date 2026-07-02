'use client';

import { generateIcs, downloadIcs } from '@/lib/ics';
import type { PublicEvent } from '@/types/event';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

interface EventDetailActionsProps {
  event: PublicEvent;
}

export function EventDetailActions({ event }: EventDetailActionsProps) {
  const registrationUrl = event.ticketUrl ?? event.eventUrl;
  const reminderUrl = BOT_USERNAME
    ? `https://t.me/${BOT_USERNAME}?start=remind_${event.id}`
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
    <div
      className="flex flex-col gap-3 mb-6"
      role="group"
      aria-label="Действия с мероприятием"
    >
      {registrationUrl && (
        <a
          href={registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full tablet:w-auto inline-flex items-center justify-center gap-2 bg-mint text-primary font-semibold px-6 py-3.5 rounded-xl text-base hover:bg-mint/90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
        >
          {event.ticketSalesEnabled ? 'Купить билет' : 'Зарегистрироваться'}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3.5 9h11M10 4.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}

      {reminderUrl && (
        <a
          href={reminderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full tablet:w-auto inline-flex items-center justify-center gap-2 border-2 border-primary/20 text-primary font-semibold px-6 py-3.5 rounded-xl text-base hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 2a5.5 5.5 0 0 1 5.5 5.5c0 1.5-.3 2.8-.8 3.8L15 13.5H3l1.3-2.2A9.3 9.3 0 0 1 3.5 7.5 5.5 5.5 0 0 1 9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M7 13.5c0 1.1.9 2 2 2s2-.9 2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Напомнить
        </a>
      )}

      <button
        type="button"
        onClick={handleIcsDownload}
        className="w-full tablet:w-auto inline-flex items-center justify-center gap-2 text-primary/60 font-medium px-4 py-2.5 rounded-xl text-sm hover:text-primary hover:bg-primary/5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Добавить мероприятие в календарь (скачать ICS)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Добавить в календарь (.ics)
      </button>
    </div>
  );
}
