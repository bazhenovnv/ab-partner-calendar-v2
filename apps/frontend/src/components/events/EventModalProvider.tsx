'use client';

import Image from 'next/image';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PublicEvent } from '@/types/event';
import v2 from './event-modal-v2.module.css';

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
    setEvent(preview); setLoading(true);
    try {
      const response = await fetch(`/api/events/public/${preview.id}`, { cache: 'no-store' });
      if (response.ok) setEvent((await response.json()) as PublicEvent);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!event) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', onKey); };
  }, [close, event]);
  const value = useMemo(() => ({ openEvent }), [openEvent]);
  return <EventModalContext.Provider value={value}>{children}{event && <EventModal event={event} loading={loading} onClose={close} />}</EventModalContext.Provider>;
}

function cleanSpeaker(value?: string | null): string | null {
  if (!value) return null;
  return value.split(/\s+[—–-]\s+/)[0]?.trim() || null;
}
function normalize(value: string): string { return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU'); }
function safeOrganizerUrl(event: PublicEvent): string | null {
  const candidate = event.ticketSalesEnabled ? event.ticketUrl : event.eventUrl;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.hostname === 'max.ru' && url.pathname.startsWith('/join/')) return null;
    return candidate;
  } catch { return null; }
}

function EventModal({ event, loading, onClose }: { event: PublicEvent; loading: boolean; onClose: () => void }) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const image = event.images?.[0];
  const imageUrl = image?.modalUrl ?? image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl;
  const actionLabel = event.ticketSalesEnabled ? 'Купить билет' : 'Участвовать';
  const actionUrl = safeOrganizerUrl(event);
  const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' }).format(new Date(event.startDate));
  const format = event.format === 'ONLINE' ? 'Онлайн' : event.cityName ?? event.city?.name ?? 'Офлайн';
  const price = event.priceType === 'FREE' ? 'Бесплатно' : event.priceText ?? 'Платно';
  const speaker = cleanSpeaker(event.speaker);
  const lead = (event.shortDescription ?? '').trim();
  const leadNorm = normalize(lead);
  const body = (event.fullDescription ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
    .filter((line) => normalize(line) !== normalize(event.title))
    .filter((line) => !leadNorm || normalize(line) !== leadNorm)
    .filter((line) => !/^(дата|когда|формат|стоимость|спикер)\s*:/i.test(line))
    .filter((line) => !line.startsWith('🎙')).filter((line) => !/^зарегистрироваться/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line)).filter((line) => !/^#/.test(line));
  const status = event.autoStatus === 'LIVE' ? 'Идёт сейчас' : event.autoStatus === 'COMPLETED' ? 'Завершено' : 'Запланировано';

  return <div className={v2.backdrop} role="presentation" onMouseDown={onClose}>
    <article className={v2.modal} role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onMouseDown={(e) => e.stopPropagation()}>
      <button className={v2.close} type="button" onClick={onClose} aria-label="Закрыть">×</button>
      <div className={v2.media}><div className={v2.imageStage}>{imageUrl ? <Image src={imageUrl} alt={event.title} fill unoptimized priority className={v2.image} /> : null}</div></div>
      <div className={v2.content}>
        <span className={v2.status}>{status}</span>
        <h2 id="event-modal-title" className={v2.title}>{event.title}</h2>
        {lead && <p className={v2.lead}>{lead}</p>}
        <div className={v2.facts}>
          <div className={v2.fact}><span className={v2.icon}>▣</span><span><small className={v2.label}>Дата</small><strong className={v2.value}>{date}</strong></span></div>
          <div className={v2.fact}><span className={v2.icon}>◷</span><span><small className={v2.label}>Время</small><strong className={v2.value}>{event.startTime ? `${event.startTime} (МСК)` : 'Уточняется'}</strong></span></div>
          <div className={v2.fact}><span className={v2.icon}>₽</span><span><small className={v2.label}>Стоимость</small><strong className={v2.value}>{price}</strong></span></div>
        </div>
        <div className={v2.lines}><span>⌁ {format}</span>{speaker && <strong>♙ Спикер: {speaker}</strong>}</div>
        {body.length > 0 && <div className={v2.description}>{body.map((line, i) => <p key={`${i}-${line.slice(0, 20)}`}>{line}</p>)}</div>}
        <div className={v2.actions}>
          {actionUrl ? <a className={v2.primary} href={actionUrl} target="_blank" rel="noopener noreferrer">{actionLabel}</a> : <span className={cn(v2.primary)} aria-disabled="true" title="Ссылка организатора не указана">{actionLabel}</span>}
          <button className={v2.remind} type="button" onClick={() => setReminderOpen(true)}><span className={v2.bell} aria-hidden="true">🔔</span>Напомнить</button>
        </div>
        {loading && <small>Обновляем данные…</small>}
      </div>
      {reminderOpen && <ReminderChooser event={event} onClose={() => setReminderOpen(false)} />}
    </article>
  </div>;
}

function ReminderChooser({ event, onClose }: { event: PublicEvent; onClose: () => void }) {
  const tg = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim();
  const max = process.env.NEXT_PUBLIC_MAX_BOT_USERNAME?.replace(/^@/, '').trim();
  const payload = `remind_${event.id}`;
  const tgUrl = tg ? `https://t.me/${tg}?start=${encodeURIComponent(payload)}` : null;
  const maxUrl = max ? `https://max.ru/${max}?start=${encodeURIComponent(payload)}` : null;
  return <div className={v2.chooserOverlay} role="presentation" onMouseDown={onClose}><section className={v2.chooser} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
    <button className={v2.chooserClose} type="button" onClick={onClose}>×</button><h3>Напомнить</h3><p>Выберите, куда отправить напоминание</p>
    <div className={v2.platforms}>{tgUrl ? <a className={v2.platform} href={tgUrl} target="_blank" rel="noopener noreferrer">Telegram <span>›</span></a> : null}{maxUrl ? <a className={v2.platform} href={maxUrl} target="_blank" rel="noopener noreferrer">MAX <span>›</span></a> : null}</div>
    <button className={v2.cancel} type="button" onClick={onClose}>Отмена</button>
  </section></div>;
}
