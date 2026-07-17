'use client';

import Image from 'next/image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PublicEvent } from '@/types/event';
import v2 from './event-modal-v2.module.css';

interface EventModalContextValue {
  openEvent: (event: PublicEvent) => void;
}

const EventModalContext = createContext<EventModalContextValue | null>(null);

export function useEventModal(): EventModalContextValue {
  const context = useContext(EventModalContext);
  if (!context) {
    throw new Error('useEventModal must be used within EventModalProvider');
  }
  return context;
}

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const loadEvent = useCallback(async (preview: PublicEvent) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    const requestSequence = ++requestSequenceRef.current;
    abortControllerRef.current = controller;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/events/public/${preview.id}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loadedEvent = (await response.json()) as PublicEvent;
      if (!controller.signal.aborted && requestSequence === requestSequenceRef.current) {
        setEvent(loadedEvent);
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return;
      }
      if (requestSequence === requestSequenceRef.current) {
        setLoadError('Не удалось загрузить полную информацию о мероприятии.');
      }
    } finally {
      if (!controller.signal.aborted && requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const openEvent = useCallback(
    (preview: PublicEvent) => {
      const activeElement = document.activeElement;
      returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
      setEvent(preview);
      void loadEvent(preview);
    },
    [loadEvent],
  );

  const close = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestSequenceRef.current += 1;
    setEvent(null);
    setLoading(false);
    setLoadError(null);
    window.requestAnimationFrame(() => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      returnFocusRef.current = null;
    });
  }, []);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    if (!event) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [event]);

  const value = useMemo(() => ({ openEvent }), [openEvent]);

  return (
    <EventModalContext.Provider value={value}>
      {children}
      {event && (
        <EventModal
          event={event}
          loading={loading}
          loadError={loadError}
          onRetry={() => void loadEvent(event)}
          onClose={close}
        />
      )}
    </EventModalContext.Provider>
  );
}

function cleanSpeaker(value?: string | null): string | null {
  return value?.split(/\s+[—–-]\s+/)[0]?.trim() || null;
}

function isAllowedWebsite(value?: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    return ![
      'max.ru',
      't.me',
      'telegram.me',
      'telegram.dog',
      'vk.me',
      'wa.me',
    ].includes(host);
  } catch {
    return false;
  }
}

function organizerActionUrl(event: PublicEvent): string | null {
  const candidate = event.ticketSalesEnabled ? event.ticketUrl : event.eventUrl;
  return isAllowedWebsite(candidate) ? candidate : null;
}

function sanitizeDescription(value?: string | null): string {
  if (!value) return '';

  return value
    .replace(
      /<(p|div|li)[^>]*>[\s\S]*?(?:зарегистрир|регистрац|для\s+участия|принять\s+участие|подать\s+заявку)[\s\S]*?<\/\1>/gi,
      '',
    )
    .replace(
      /<a\b[^>]*href=["'][^"']*(?:max\.ru\/join|t\.me\/|telegram\.me\/)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      '',
    )
    .replace(/https?:\/\/(?:www\.)?(?:max\.ru\/join|t\.me|telegram\.me)\/[^\s<]+/gi, '')
    .replace(/(?:зарегистрируйтесь|регистрация|для участия)[^.!?<]*(?:[.!?]|$)/gi, '')
    .replace(/<p[^>]*>\s*(?:&nbsp;|<br\s*\/?\s*>)*\s*<\/p>/gi, '')
    .trim();
}

function Icon({ name }: { name: 'calendar' | 'clock' | 'price' | 'location' | 'speaker' | 'bell' }) {
  const paths = {
    calendar: 'M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    clock: 'M12 7.5V12l3 2',
    price: 'M8 5h5.2a4 4 0 1 1 0 8H8m0-4h7M8 13v6m0-3h6',
    location: 'M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z',
    speaker: 'M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6',
    bell: 'M6.5 16.5h11l-1.2-1.7V10a4.3 4.3 0 0 0-8.6 0v4.8l-1.2 1.7Z',
  } as const;

  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      {name === 'clock' && <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />}
      {name === 'speaker' && <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />}
      {name === 'location' && <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />}
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {name === 'bell' && <path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

function EventModal({
  event,
  loading,
  loadError,
  onRetry,
  onClose,
}: {
  event: PublicEvent;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reminderTriggerRef = useRef<HTMLButtonElement>(null);

  const image = event.images?.[0];
  const imageUrl = image?.modalUrl ?? image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl;
  const actionLabel = event.ticketSalesEnabled ? 'Купить билет' : 'Участвовать';
  const actionUrl = organizerActionUrl(event);
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  }).format(new Date(event.startDate));
  const format = event.format === 'ONLINE' ? 'Онлайн' : event.cityName ?? event.city?.name ?? 'Офлайн';
  const price = event.priceType === 'FREE' ? 'Бесплатно' : event.priceText ?? 'Платно';
  const speaker = cleanSpeaker(event.speaker);
  const lead = event.shortDescription?.trim() ?? '';
  const description = sanitizeDescription(event.fullDescription);
  const status = event.autoStatus === 'LIVE' ? 'Идёт сейчас' : event.autoStatus === 'COMPLETED' ? 'Завершено' : 'Запланировано';

  useEffect(() => closeButtonRef.current?.focus(), []);

  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== 'Escape') return;
      keyboardEvent.preventDefault();
      if (reminderOpen) {
        setReminderOpen(false);
        window.requestAnimationFrame(() => reminderTriggerRef.current?.focus());
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, reminderOpen]);

  return (
    <div className={v2.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article ref={modalRef} className={v2.modal} role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        <button ref={closeButtonRef} className={v2.close} type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className={v2.media}>
          <div className={v2.imageStage}>
            {imageUrl ? (
              <Image src={imageUrl} alt={event.title} fill unoptimized priority className={v2.image} />
            ) : (
              <div className={v2.imagePlaceholder}>АБ</div>
            )}
          </div>
        </div>

        <div className={v2.content}>
          <div className={v2.scrollArea}>
            <span className={v2.status}>{status}</span>
            <h2 id="event-modal-title" className={v2.title}>{event.title}</h2>
            {lead && <p className={v2.lead}>{lead}</p>}

            <div className={v2.facts}>
              <Fact icon="calendar" label="Дата" value={date} />
              <Fact icon="clock" label="Время" value={event.startTime ? `${event.startTime} (МСК)` : 'Уточняется'} />
              <Fact icon="price" label="Стоимость" value={price} />
            </div>

            <div className={v2.lines}>
              <span className={v2.detailLine}><Icon name="location" />{format}</span>
              {speaker && <strong className={v2.detailLine}><Icon name="speaker" />Спикер: {speaker}</strong>}
            </div>

            {description && <div className={v2.description} dangerouslySetInnerHTML={{ __html: description }} />}

            {loadError && (
              <div className={v2.loadError} role="alert">
                <p>{loadError}</p>
                <button type="button" className={v2.retry} onClick={onRetry} disabled={loading}>
                  {loading ? 'Загрузка…' : 'Повторить'}
                </button>
              </div>
            )}
          </div>

          <div className={v2.actionBar}>
            <div className={v2.actions}>
              {actionUrl ? (
                <a className={v2.primary} href={actionUrl} target="_blank" rel="noopener noreferrer">{actionLabel}</a>
              ) : (
                <button className={v2.primary} type="button" disabled title="Сайт организатора не указан">{actionLabel}</button>
              )}
              <button ref={reminderTriggerRef} className={v2.remind} type="button" onClick={() => setReminderOpen(true)}>
                <Icon name="bell" /> Напомнить
              </button>
            </div>
            {loading && <div className={v2.loading}><span className={v2.spinner} />Обновляем данные…</div>}
          </div>
        </div>

        {reminderOpen && <ReminderChooser event={event} onClose={() => setReminderOpen(false)} />}
      </article>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: 'calendar' | 'clock' | 'price'; label: string; value: string }) {
  return (
    <div className={v2.fact}>
      <span className={v2.icon}><Icon name={icon} /></span>
      <span><small className={v2.label}>{label}</small><strong className={v2.value}>{value}</strong></span>
    </div>
  );
}

function ReminderChooser({ event, onClose }: { event: PublicEvent; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const telegramUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim();
  const maxUsername = process.env.NEXT_PUBLIC_MAX_BOT_USERNAME?.replace(/^@/, '').trim();
  const payload = `remind_${event.id}`;
  const telegramUrl = telegramUsername ? `https://t.me/${telegramUsername}?start=${encodeURIComponent(payload)}` : null;
  const maxUrl = maxUsername ? `https://max.ru/${maxUsername}?start=${encodeURIComponent(payload)}` : null;

  useEffect(() => closeButtonRef.current?.focus(), []);

  return (
    <div className={v2.chooserOverlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={v2.chooser} role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title">
        <button ref={closeButtonRef} className={v2.chooserClose} type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <Image src="/ui-icons/reminder-header.png" width={107} height={59} alt="" className={v2.chooserHeaderImage} />
        <h3 id="reminder-dialog-title">Напомнить</h3>
        <p>Выберите удобный способ получить напоминание</p>

        <div className={v2.platforms}>
          <ReminderLink href={telegramUrl} image="/ui-icons/icon-telegram.png" title="Telegram" subtitle="Получить напоминание в боте" />
          <ReminderLink href={maxUrl} image="/ui-icons/icon-max.png" title="MAX" subtitle="Получить напоминание в боте" />
          <ReminderLink href="mailto:info-event@a-b.ru?subject=Стать партнёром АБ Афиши" image="/ui-icons/icon-partner.png" title="Стать партнёром" subtitle="Разместить своё мероприятие" />
        </div>

        <button className={v2.cancel} type="button" onClick={onClose}>Отмена</button>
      </section>
    </div>
  );
}

function ReminderLink({ href, image, title, subtitle }: { href: string | null; image: string; title: string; subtitle: string }) {
  const content = (
    <>
      <Image src={image} width={56} height={56} alt="" />
      <span className={v2.platformText}><strong>{title}</strong><small>{subtitle}</small></span>
      <span className={v2.platformArrow} aria-hidden="true">›</span>
    </>
  );

  return href ? (
    <a className={v2.platform} href={href} target="_blank" rel="noopener noreferrer">{content}</a>
  ) : (
    <div className={`${v2.platform} ${v2.platformDisabled}`} aria-disabled="true">{content}</div>
  );
}
