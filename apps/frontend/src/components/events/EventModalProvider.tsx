'use client';

import Image from 'next/image';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicEvent } from '@/types/event';

interface EventModalContextValue {
  openEvent: (event: PublicEvent) => void;
}

const EventModalContext = createContext<EventModalContextValue | null>(null);

export function useEventModal(): EventModalContextValue {
  const context = useContext(EventModalContext);
  if (!context) throw new Error('useEventModal must be used within EventModalProvider');
  return context;
}

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => {
    setEvent(null);
    setLoading(false);
  }, []);

  const openEvent = useCallback(async (preview: PublicEvent) => {
    setEvent(preview);
    setLoading(true);
    try {
      const response = await fetch(`/api/events/public/${preview.id}`, { cache: 'no-store' });
      if (response.ok) setEvent((await response.json()) as PublicEvent);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!event) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, event]);

  const value = useMemo(() => ({ openEvent }), [openEvent]);

  return (
    <EventModalContext.Provider value={value}>
      {children}
      {event && <EventModal event={event} loading={loading} onClose={close} />}
    </EventModalContext.Provider>
  );
}

function EventModal({ event, loading, onClose }: { event: PublicEvent; loading: boolean; onClose: () => void }) {
  const image = event.images?.[0];
  const imageUrl = image?.modalUrl ?? image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl;
  const registrationUrl = event.ticketUrl ?? event.eventUrl;
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow',
  }).format(new Date(event.startDate));

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <button type="button" className="event-modal-close" onClick={onClose} aria-label="Закрыть окно">×</button>
        <div className="event-modal-media">
          {imageUrl ? (
            <Image src={imageUrl} alt={event.title} fill unoptimized priority className="event-modal-image" />
          ) : (
            <div className="event-modal-image-placeholder" aria-hidden="true">АБ</div>
          )}
        </div>
        <div className="event-modal-content">
          <div className="event-modal-meta">
            <span>{date}{event.startTime ? `, ${event.startTime} (МСК)` : ''}</span>
            <span>{event.format === 'ONLINE' ? 'Онлайн' : event.cityName ?? event.city?.name ?? 'Офлайн'}</span>
            <span>{event.priceType === 'FREE' ? 'Бесплатно' : event.priceText ?? 'Платно'}</span>
          </div>
          <h2 id="event-modal-title" className="event-modal-title">{event.title}</h2>
          {event.speaker && <p className="event-modal-speaker">Спикер: {event.speaker}</p>}
          <div className="event-modal-description">
            {(event.fullDescription ?? event.shortDescription ?? '').split('\n').filter(Boolean).map((line, index) => (
              <p key={`${index}-${line.slice(0, 20)}`}>{line}</p>
            ))}
          </div>
          <div className="event-modal-actions">
            {registrationUrl && (
              <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="event-modal-primary-btn">
                Подробнее →
              </a>
            )}
            <button type="button" className="event-modal-secondary-btn" onClick={onClose}>Закрыть</button>
          </div>
          {loading && <span className="event-modal-loading">Обновляем данные…</span>}
        </div>
      </article>
    </div>
  );
}
