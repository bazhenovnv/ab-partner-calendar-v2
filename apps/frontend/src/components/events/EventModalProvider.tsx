'use client';

import Image from 'next/image';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicEvent } from '@/types/event';
import styles from './events-runtime.module.css';

interface EventModalContextValue { openEvent: (event: PublicEvent) => void; }
const EventModalContext = createContext<EventModalContextValue | null>(null);

export function useEventModal(): EventModalContextValue {
  const context = useContext(EventModalContext);
  if (!context) throw new Error('useEventModal must be used within EventModalProvider');
  return context;
}

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => { setEvent(null); setLoading(false); }, []);
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
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <article className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onMouseDown={(eventObject) => eventObject.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Закрыть окно">×</button>
        <div className={styles.modalMedia}>
          {imageUrl ? (
            <Image src={imageUrl} alt={event.title} fill unoptimized priority className={styles.modalImage} />
          ) : (
            <div className={styles.modalPlaceholder} aria-hidden="true">АБ</div>
          )}
        </div>
        <div className={styles.modalContent}>
          <div className={styles.modalMeta}>
            <span>{date}{event.startTime ? `, ${event.startTime} (МСК)` : ''}</span>
            <span>{event.format === 'ONLINE' ? 'Онлайн' : event.cityName ?? event.city?.name ?? 'Офлайн'}</span>
            <span>{event.priceType === 'FREE' ? 'Бесплатно' : event.priceText ?? 'Платно'}</span>
          </div>
          <h2 id="event-modal-title" className={styles.modalTitle}>{event.title}</h2>
          {event.speaker && <p className={styles.modalSpeaker}>Спикер: {event.speaker}</p>}
          <div className={styles.modalDescription}>
            {(event.fullDescription ?? event.shortDescription ?? '').split('\n').filter(Boolean).map((line, index) => (
              <p key={`${index}-${line.slice(0, 20)}`}>{line}</p>
            ))}
          </div>
          <div className={styles.modalActions}>
            {registrationUrl && <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className={styles.modalPrimary}>Подробнее →</a>}
            <button type="button" className={styles.modalSecondary} onClick={onClose}>Закрыть</button>
          </div>
          {loading && <span className={styles.modalLoading}>Обновляем данные…</span>}
        </div>
      </article>
    </div>
  );
}
