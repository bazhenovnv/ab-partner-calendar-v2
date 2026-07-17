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
  if (!context) throw new Error('useEventModal must be used within EventModalProvider');
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
    return !['max.ru', 't.me', 'telegram.me', 'telegram.dog', 'vk.me', 'wa.me'].includes(host);
  } catch {
    return false;
  }
}

function organizerActionUrl(event: PublicEvent): string | null {
  const candidates = [event.eventUrl, event.ticketUrl];

  for (const candidate of candidates) {
    if (isAllowedWebsite(candidate)) return candidate;
  }

  return null;
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

type LineIconName = 'location' | 'speaker';

function LineIcon({ name }: { name: LineIconName }) {
  const paths: Record<LineIconName, string> = {
    location: 'M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z',
    speaker: 'M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6',
  };

  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      {name === 'speaker' && (
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      )}
      {name === 'location' && (
        <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
      )}
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FACT_ICONS = {
  calendar: '/ui-icons/event-calendar.png',
  clock: '/ui-icons/event-clock.png',
  price: '/ui-icons/event-price.png',
} as const;

const ACTION_ICONS = {
  participate: '/ui-icons/event-action-participate.png',
  remind: '/ui-icons/event-action-remind.png',
} as const;

type FactIconName = keyof typeof FACT_ICONS;

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reminderTriggerRef = useRef<HTMLButtonElement>(null);

  const image = event.images?.[0];
  const imageUrl =
    image?.modalUrl ?? image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl;
  const actionLabel = 'Участвовать';
  const actionUrl = organizerActionUrl(event);
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  }).format(new Date(event.startDate));
  const format =
    event.format === 'ONLINE' ? 'Онлайн' : event.cityName ?? event.city?.name ?? 'Офлайн';
  const price = event.priceType === 'FREE' ? 'Бесплатно' : event.priceText ?? 'Платно';
  const speaker = cleanSpeaker(event.speaker);
  const lead = event.shortDescription?.trim() ?? '';
  const description = sanitizeDescription(event.fullDescription);
  const status =
    event.autoStatus === 'LIVE'
      ? 'Идёт сейчас'
      : event.autoStatus === 'COMPLETED'
        ? 'Завершено'
        : 'Запланировано';

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

  const actionIcon = (
    <Image
      src={ACTION_ICONS.participate}
      width={31}
      height={23}
      alt=""
      aria-hidden="true"
      style={{ width: 20, height: 'auto', objectFit: 'contain', flex: '0 0 auto' }}
    />
  );

  return (
    <div
      className={v2.backdrop}
      role="presentation"
      onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}
    >
      <article className={v2.modal} role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
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
              <span className={v2.detailLine}><LineIcon name="location" />{format}</span>
              {speaker && <strong className={v2.detailLine}><LineIcon name="speaker" />Спикер: {speaker}</strong>}
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
                <a
                  className={v2.primary}
                  href={actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ gap: 8 }}
                >
                  {actionIcon}
                  {actionLabel}
                </a>
              ) : (
                <button
                  className={v2.primary}
                  type="button"
                  disabled
                  title="Сайт организатора не указан"
                  style={{ gap: 8 }}
                >
                  {actionIcon}
                  {actionLabel}
                </button>
              )}

              <button
                ref={reminderTriggerRef}
                className={v2.remind}
                type="button"
                onClick={() => setReminderOpen(true)}
              >
                <Image
                  src={ACTION_ICONS.remind}
                  width={33}
                  height={33}
                  alt=""
                  aria-hidden="true"
                  style={{ width: 20, height: 20, objectFit: 'contain', flex: '0 0 auto' }}
                />
                Напомнить
              </button>
            </div>

            {loading && (
              <div className={v2.loading} role="status">
                <span className={v2.spinner} />
                Обновляем данные…
              </div>
            )}
          </div>
        </div>

        {reminderOpen && <ReminderChooser event={event} onClose={() => setReminderOpen(false)} />}
      </article>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: FactIconName; label: string; value: string }) {
  return (
    <div className={v2.fact}>
      <Image
        src={FACT_ICONS[icon]}
        width={78}
        height={78}
        alt=""
        className={`${v2.factIcon} ${v2[`factIcon_${icon}`]}`}
      />
      <span className={v2.factText}>
        <small className={v2.label}>{label}</small>
        <strong className={v2.value}>{value}</strong>
      </span>
    </div>
  );
}

function buildReminderUrl(service: 'telegram' | 'max', eventId: string): string | null {
  const payload = `remind_${eventId}`;

  if (service === 'telegram') {
    const directUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim();
    if (directUrl) return `${directUrl}${directUrl.includes('?') ? '&' : '?'}start=${encodeURIComponent(payload)}`;

    const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim();
    if (username) return `https://t.me/${username}?start=${encodeURIComponent(payload)}`;

    return `https://t.me/PartnersTogether_bot?start=${encodeURIComponent(payload)}`;
  }

  const directUrl = process.env.NEXT_PUBLIC_MAX_BOT_URL?.trim();
  if (directUrl) return `${directUrl}${directUrl.includes('?') ? '&' : '?'}start=${encodeURIComponent(payload)}`;

  const username = process.env.NEXT_PUBLIC_MAX_BOT_USERNAME?.replace(/^@/, '').trim();
  return username ? `https://max.ru/${username}?start=${encodeURIComponent(payload)}` : null;
}

function ReminderChooser({ event, onClose }: { event: PublicEvent; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const telegramUrl = buildReminderUrl('telegram', event.id);
  const maxUrl = buildReminderUrl('max', event.id);

  useEffect(() => closeButtonRef.current?.focus(), []);

  return (
    <div
      className={v2.chooserOverlay}
      role="presentation"
      onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}
    >
      <section className={v2.chooser} role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title">
        <button ref={closeButtonRef} className={v2.chooserClose} type="button" onClick={onClose} aria-label="Закрыть">×</button>

        <Image src="/ui-icons/reminder-header.png" width={107} height={59} alt="" className={v2.chooserHeaderImage} />
        <h3 id="reminder-dialog-title">Напомнить</h3>
        <p>Выберите удобный способ получить напоминание</p>

        <div className={v2.platforms}>
          <ReminderLink href={telegramUrl} image="/ui-icons/icon-telegram.png" title="Telegram" subtitle="Получить напоминание в боте" />
          <ReminderLink href={maxUrl} image="/ui-icons/icon-max.png" title="MAX" subtitle="Получить напоминание в боте" />
        </div>

        <button className={v2.cancel} type="button" onClick={onClose}>Отмена</button>
      </section>
    </div>
  );
}

function ReminderLink({
  href,
  image,
  title,
  subtitle,
}: {
  href: string | null;
  image: string;
  title: string;
  subtitle: string;
}) {
  const content = (
    <>
      <Image src={image} width={56} height={56} alt="" />
      <span className={v2.platformText}>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className={v2.platformArrow} aria-hidden="true">›</span>
    </>
  );

  return href ? (
    <a className={v2.platform} href={href} target="_blank" rel="noopener noreferrer">{content}</a>
  ) : (
    <div className={`${v2.platform} ${v2.platformDisabled}`} aria-disabled="true">{content}</div>
  );
}
