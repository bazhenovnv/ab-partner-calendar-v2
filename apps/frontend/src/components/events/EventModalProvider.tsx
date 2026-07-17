'use client';

import Image from 'next/image';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import styles from './events-runtime.module.css';
import ui from './event-interactions.module.css';

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

function cleanSpeaker(value?: string | null): string | null {
  if (!value) return null;
  return value.split(/\s+[—–-]\s+/)[0]?.trim() || null;
}

function EventModal({ event, loading, onClose }: { event: PublicEvent; loading: boolean; onClose: () => void }) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const image = event.images?.[0];
  const imageUrl = image?.modalUrl ?? image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl;
  const actionLabel = event.ticketSalesEnabled ? 'Купить билет' : 'Участвовать';
  const actionUrl = event.ticketSalesEnabled ? event.ticketUrl : event.eventUrl;
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow',
  }).format(new Date(event.startDate));
  const time = event.startTime ? `${event.startTime}${event.endDate ? '' : ''}` : 'Время уточняется';
  const format = event.format === 'ONLINE' ? 'Онлайн' : event.cityName ?? event.city?.name ?? 'Офлайн';
  const price = event.priceType === 'FREE' ? 'Бесплатно' : event.priceText ?? 'Платно';
  const speakerName = cleanSpeaker(event.speaker);
  const statusLabel = event.autoStatus === 'LIVE' ? 'Идёт сейчас' : event.autoStatus === 'COMPLETED' ? 'Завершено' : 'Запланировано';

  const shortDescription = event.shortDescription?.trim() || '';
  const sourceDescription = event.fullDescription ?? '';
  const descriptionLines = sourceDescription
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.toLocaleLowerCase('ru-RU') !== event.title.trim().toLocaleLowerCase('ru-RU'))
    .filter((line) => !/^(дата|когда|формат|стоимость|спикер)\s*:/i.test(line))
    .filter((line) => !line.startsWith('🎙'))
    .filter((line) => !/^зарегистрироваться/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/^#/.test(line));
  const detailText = descriptionLines.join(' ');

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <article className={cn(styles.modal, ui.modalFrame)} role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onMouseDown={(eventObject) => eventObject.stopPropagation()}>
        <button type="button" className={cn(styles.modalClose, ui.modalClose)} onClick={onClose} aria-label="Закрыть окно">×</button>

        <div className={ui.modalMedia}>
          <div className={ui.modalImageStage}>
            {imageUrl ? (
              <Image src={imageUrl} alt={event.title} fill unoptimized priority className={ui.modalImage} />
            ) : (
              <div className={styles.modalPlaceholder} aria-hidden="true">АБ</div>
            )}
          </div>
        </div>

        <div className={ui.modalContent}>
          <span className={cn(ui.modalStatus, event.autoStatus === 'LIVE' && ui.modalStatusLive, event.autoStatus === 'COMPLETED' && ui.modalStatusCompleted)}>{statusLabel}</span>
          <h2 id="event-modal-title" className={ui.modalTitle}>{event.title}</h2>
          {shortDescription && <p className={ui.modalLead}>{shortDescription}</p>}

          <div className={ui.modalFacts}>
            <div className={ui.modalFact}><span className={ui.modalFactIcon}>▣</span><span><small>Дата</small><strong>{date}</strong></span></div>
            <div className={ui.modalFact}><span className={ui.modalFactIcon}>◷</span><span><small>Время</small><strong>{time}</strong></span></div>
            <div className={ui.modalFact}><span className={ui.modalFactIcon}>₽</span><span><small>Стоимость</small><strong>{price}</strong></span></div>
          </div>

          <div className={ui.modalSummary}>
            <p><span aria-hidden="true">⌁</span> {format}</p>
            {speakerName && <p><span aria-hidden="true">♧</span> <strong>Спикер:</strong> {speakerName}</p>}
            {event.venue && <p><strong>Место:</strong> {event.venue}</p>}
            {event.address && <p><strong>Адрес:</strong> {event.address}</p>}
          </div>

          {detailText && <p className={ui.modalDescription}>{detailText}</p>}

          <div className={ui.modalActions}>
            {actionUrl ? (
              <a href={actionUrl} target="_blank" rel="noopener noreferrer" className={ui.modalPrimary}>{actionLabel}</a>
            ) : (
              <span className={cn(ui.modalPrimary, ui.modalActionDisabled)} aria-disabled="true">{actionLabel}</span>
            )}
            <button type="button" className={ui.modalReminder} onClick={() => setReminderOpen(true)}>
              <span aria-hidden="true">♧</span> Напомнить
            </button>
          </div>
          {loading && <span className={styles.modalLoading}>Обновляем данные…</span>}
        </div>

        {reminderOpen && <ReminderChooser event={event} onClose={() => setReminderOpen(false)} />}
      </article>
    </div>
  );
}

function ReminderChooser({ event, onClose }: { event: PublicEvent; onClose: () => void }) {
  const telegramUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim();
  const maxUsername = process.env.NEXT_PUBLIC_MAX_BOT_USERNAME?.replace(/^@/, '').trim();
  const payload = `remind_${event.id}`;
  const telegramUrl = telegramUsername ? `https://t.me/${telegramUsername}?start=${encodeURIComponent(payload)}` : null;
  const maxUrl = maxUsername ? `https://max.ru/${maxUsername}?start=${encodeURIComponent(payload)}` : null;

  return (
    <div className={ui.reminderOverlay} role="presentation" onMouseDown={onClose}>
      <section className={ui.reminderDialog} role="dialog" aria-modal="true" aria-labelledby="reminder-title" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className={ui.reminderClose} onClick={onClose} aria-label="Закрыть выбор мессенджера">×</button>
        <h3 id="reminder-title">Напомнить</h3>
        <p>Выберите, куда отправить напоминание</p>
        <div className={ui.reminderPlatforms}>
          {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={ui.reminderPlatform}>Telegram <span>›</span></a> : <span className={cn(ui.reminderPlatform, ui.reminderPlatformDisabled)}>Telegram <span>›</span></span>}
          {maxUrl ? <a href={maxUrl} target="_blank" rel="noopener noreferrer" className={ui.reminderPlatform}>MAX <span>›</span></a> : <span className={cn(ui.reminderPlatform, ui.reminderPlatformDisabled)}>MAX <span>›</span></span>}
        </div>
        <button type="button" className={ui.reminderCancel} onClick={onClose}>Отмена</button>
      </section>
    </div>
  );
}
