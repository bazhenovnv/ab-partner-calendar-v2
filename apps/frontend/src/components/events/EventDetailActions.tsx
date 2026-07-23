'use client';

import { generateIcs, downloadIcs } from '@/lib/ics';
import { ym } from '@/lib/metrika';
import type { PublicEvent } from '@/types/event';

const TG_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';
const MAX_BOT_URL = process.env.NEXT_PUBLIC_MAX_BOT_URL ?? '';

interface EventDetailActionsProps {
  event: PublicEvent;
}

export function EventDetailActions({ event }: EventDetailActionsProps) {
  const registrationUrl = event.ticketUrl ?? event.eventUrl;
  const tgReminderUrl = TG_BOT_USERNAME
    ? `https://t.me/${TG_BOT_USERNAME}?start=remind_${event.id}`
    : null;
  const maxReminderUrl = MAX_BOT_URL
    ? `${MAX_BOT_URL}?start=remind_${event.id}`
    : null;

  const handleIcsDownload = () => {
    ym.goal('ics_download', { event_id: event.id });
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
      className="flex flex-col tablet:flex-row tablet:flex-wrap gap-3 mb-6"
      role="group"
      aria-label="Действия с мероприятием"
    >
      {registrationUrl && (
        <a
          href={registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ym.goal(event.ticketSalesEnabled ? 'ticket_buy' : 'event_register', { event_id: event.id })}
          className="w-full tablet:w-auto inline-flex items-center justify-center gap-2 bg-mint text-primary font-semibold px-6 py-3.5 rounded-xl text-base hover:bg-mint/90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
        >
          {event.ticketSalesEnabled ? 'Купить билет' : 'Зарегистрироваться'}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3.5 9h11M10 4.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}

      {tgReminderUrl && (
        <a
          href={tgReminderUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Напомнить через Telegram"
          onClick={() => ym.goal('reminder_telegram', { event_id: event.id })}
          className="w-full tablet:w-auto inline-flex items-center justify-center gap-2 border-2 border-primary/20 text-primary font-semibold px-6 py-3.5 rounded-xl text-base hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
          </svg>
          Напомнить в Telegram
        </a>
      )}

      {maxReminderUrl && (
        <a
          href={maxReminderUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Напомнить через MAX"
          onClick={() => ym.goal('reminder_max', { event_id: event.id })}
          className="w-full tablet:w-auto inline-flex items-center justify-center gap-2 border-2 border-primary/20 text-primary font-semibold px-6 py-3.5 rounded-xl text-base hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7.5 12h9M13.5 8.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Напомнить в MAX
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
