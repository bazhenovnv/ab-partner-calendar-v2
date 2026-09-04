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
import {
  closeEventWithTransition,
  EVENT_BACKDROP_TRANSITION_NAME,
  EVENT_IMAGE_TRANSITION_NAME,
  EVENT_SURFACE_TRANSITION_NAME,
} from '@/lib/event-modal-transition';
import { sanitizeEventHtml } from '@/lib/html';
import { formatPrice } from '@/lib/format';
import {
  cleanEventModalDescription,
  getEventModalImageUrl,
  getEventModalSpeakers,
} from '@/lib/event-modal-content';
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
  const closingRef = useRef(false);

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
      closingRef.current = false;
      setEvent(preview);
      void loadEvent(preview);
    },
    [loadEvent],
  );

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      returnFocusRef.current = null;
      closingRef.current = false;
    });
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestSequenceRef.current += 1;

    closeEventWithTransition(
      () => {
        setEvent(null);
        setLoading(false);
        setLoadError(null);
      },
      restoreFocus,
    );
  }, [restoreFocus]);

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
  const candidates = event.ticketSalesEnabled
    ? [event.ticketUrl, event.eventUrl]
    : [event.eventUrl, event.ticketUrl];

  for (const candidate of candidates) {
    if (isAllowedWebsite(candidate)) return candidate;
  }

  return null;
}

type ModalLocation = {
  label: 'Адрес:' | 'Место:';
  value: string;
};

function normalizeLocationPart(value: string): string {
  return value
    .toLocaleLowerCase('ru-RU')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinUniqueLocationParts(parts: Array<string | null | undefined>): string {
  const result: string[] = [];
  const comparable: string[] = [];

  for (const rawPart of parts) {
    const part = rawPart?.trim();
    if (!part) continue;

    const normalized = normalizeLocationPart(part);
    if (!normalized) continue;

    if (
      comparable.some(
        (current) => current === normalized || current.includes(normalized) || normalized.includes(current),
      )
    ) {
      continue;
    }

    result.push(part);
    comparable.push(normalized);
  }

  return result.join(', ');
}

function getEventModalLocation(event: PublicEvent): ModalLocation | null {
  const city = event.cityName?.trim() || event.city?.name?.trim() || '';
  const address = event.address?.trim() || '';
  const venue = event.venue?.trim() || '';

  if (address) {
    const value = joinUniqueLocationParts([city, venue, address]);
    return value ? { label: 'Адрес:', value } : null;
  }

  const value = joinUniqueLocationParts([city, venue]);
  return value ? { label: 'Место:', value } : null;
}

type LineIconName = 'online' | 'location' | 'speaker';

function LineIcon({ name }: { name: LineIconName }) {
  if (name === 'online') {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path
          d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9.2 9.2 0 0 0 0 13M18.5 5.5a9.2 9.2 0 0 1 0 13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'speaker') {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
        <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FactIconName = 'calendar' | 'clock' | 'price';

const FACT_ICON_PATHS: Record<FactIconName, string> = {
  calendar: '/ui-icons/event-modal/calendar.png',
  clock: '/ui-icons/event-modal/clock.png',
  price: '/ui-icons/event-modal/price.png',
};

function FactIcon({ name }: { name: FactIconName }) {
  return (
    <Image
      src={FACT_ICON_PATHS[name]}
      alt=""
      width={78}
      height={78}
      className={v2.factIcon}
      aria-hidden="true"
    />
  );
}

function ReminderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={v2.actionIcon}>
      <path
        className={v2.remindBellBody}
        d="M6.5 9a5.5 5.5 0 0 1 11 0v3.2l1.6 2.5a1 1 0 0 1-.84 1.53H5.74a1 1 0 0 1-.84-1.53l1.6-2.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        className={v2.remindBellClapper}
        d="M9.5 18a2.7 2.7 0 0 0 5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reminderTriggerRef = useRef<HTMLButtonElement>(null);
  const textScrollRef = useRef<HTMLDivElement>(null);

  const imageUrl = getEventModalImageUrl(event);
  const actionLabel = event.ticketSalesEnabled ? 'Купить билет' : 'Участвовать';
  const actionUrl = organizerActionUrl(event);
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  })
    .format(new Date(event.startDate))
    .replace(/\s*г\.$/, '');
  const price = formatPrice(event.priceType, event.priceText);
  const location = getEventModalLocation(event);
  const showOnline = event.format === 'ONLINE' || event.format === 'HYBRID';
  const showLocation = event.format !== 'ONLINE' && Boolean(location);
  const speakers = getEventModalSpeakers(event);
  const speakerLabel = speakers.length > 1 ? 'Спикеры:' : 'Спикер:';
  const rawLead = sanitizeEventHtml(
    cleanEventModalDescription(event.shortDescription, event),
  );
  const description = sanitizeEventHtml(
    cleanEventModalDescription(event.fullDescription, event),
  );
  const normalizedLead = rawLead
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const normalizedDescription = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const lead =
    normalizedLead &&
    !normalizedDescription.startsWith(normalizedLead) &&
    !normalizedDescription.includes(normalizedLead)
      ? rawLead
      : '';
  const status =
    event.autoStatus === 'LIVE'
      ? { label: 'Идёт сейчас', className: v2.statusLive }
      : event.autoStatus === 'COMPLETED'
        ? { label: 'Завершено', className: v2.statusCompleted }
        : { label: 'Запланировано', className: v2.statusPlanned };

  useEffect(() => closeButtonRef.current?.focus(), []);

  useEffect(() => {
    textScrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [event.id, event.shortDescription, event.fullDescription]);

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
    <div
      className={v2.backdrop}
      role="presentation"
      data-event-modal-backdrop
      style={{
        viewTransitionName: EVENT_BACKDROP_TRANSITION_NAME,
      } as React.CSSProperties}
      onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}
    >
      <article
        className={v2.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        data-event-modal-surface
        style={{
          viewTransitionName: EVENT_SURFACE_TRANSITION_NAME,
        } as React.CSSProperties}
      >
        <button ref={closeButtonRef} className={v2.close} type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <span
          className={`${v2.status} ${status.className}`}
          data-event-modal-status
        >
          {status.label}
        </span>

        <div className={v2.media}>
          <div className={v2.imageStage} data-event-modal-image-stage>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={event.title}
                width={1280}
                height={1280}
                unoptimized
                priority
                className={v2.image}
                data-event-modal-image
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  viewTransitionName: EVENT_IMAGE_TRANSITION_NAME,
                } as React.CSSProperties}
              />
            ) : (
              <div className={v2.imagePlaceholder}>АБ</div>
            )}
          </div>
        </div>

        <div className={v2.content}>
          <div className={v2.scrollArea}>
            <div
              ref={textScrollRef}
              className={v2.textScroll}
              role="region"
              aria-label="Заголовок и описание мероприятия"
              tabIndex={0}
              data-event-modal-copy-scroll
            >
              <h2 id="event-modal-title" className={v2.title}>{event.title}</h2>

              <div className={v2.eventText}>
                {lead && (
                  <div
                    className={v2.lead}
                    dangerouslySetInnerHTML={{ __html: lead }}
                  />
                )}

                {description && (
                  <div
                    className={v2.description}
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                )}
              </div>
            </div>

            <div className={v2.facts}>
              <Fact icon="calendar" label="Дата" value={date} />
              <Fact
                icon="clock"
                label="Время"
                value={event.startTime ? `${event.startTime} (МСК)` : 'Уточняется'}
              />
              <Fact icon="price" label="Стоимость" value={price} />
            </div>

            <div className={v2.lines}>
              {showOnline && (
                <span className={v2.detailLine} data-event-modal-online>
                  <LineIcon name="online" />
                  <span className={v2.detailLabel}>Онлайн</span>
                </span>
              )}

              {showLocation && location && (
                <span className={v2.detailLine} data-event-modal-location>
                  <LineIcon name="location" />
                  <span className={v2.detailLabel}>{location.label}</span>
                  <span className={v2.detailValue}>{location.value}</span>
                </span>
              )}

              {speakers.length > 0 && (
                <span className={v2.detailLine} data-event-modal-speakers>
                  <LineIcon name="speaker" />
                  <span className={v2.detailLabel}>{speakerLabel}</span>
                  <span className={v2.detailValue}>{speakers.join(', ')}</span>
                </span>
              )}
            </div>

            {loadError && (
              <div className={v2.loadError} role="alert">
                <p>{loadError}</p>
                <button type="button" className={v2.retry} onClick={onRetry} disabled={loading}>
                  {loading ? 'Загрузка…' : 'Повторить'}
                </button>
              </div>
            )}
          </div>

          <div className={v2.actionBar} data-event-modal-action-bar>
            <div className={v2.actions} data-event-modal-actions>
              {actionUrl ? (
                <a
                  className={v2.primary}
                  href={actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {actionLabel}
                </a>
              ) : (
                <button
                  className={v2.primary}
                  type="button"
                  disabled
                  title="Сайт организатора не указан"
                >
                  {actionLabel}
                </button>
              )}

              <button
                ref={reminderTriggerRef}
                className={v2.remind}
                type="button"
                onClick={() => setReminderOpen(true)}
              >
                <ReminderIcon />
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
      <span className={`${v2.factIconWrap} ${v2[`factIcon_${icon}`]}`}>
        <FactIcon name={icon} />
      </span>
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
        <h3 id="reminder-dialog-title">Напомнить о событии</h3>
        <p>Выберите, куда отправить напоминание</p>

        <div className={v2.platforms}>
          <ReminderLink href={telegramUrl} title="Telegram" isTelegram />
          <ReminderLink href={maxUrl} image="/ui-icons/header/max-header-icon.png" title="MAX" isMax />
        </div>

        <button className={v2.cancel} type="button" onClick={onClose}>Отмена</button>
      </section>
    </div>
  );
}

function TelegramReminderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      aria-hidden="true"
      className={v2.platformIconImage}
    >
      <circle cx="12" cy="12" r="12" fill="#2aabee" />
      <path
        fill="#fff"
        d="M17.47 7.17c.18-.68-.26-.95-.73-.77L4.82 10.99c-.81.32-.8.77-.14.98l3.06.95 7.08-4.47c.33-.2.64-.09.39.13l-5.74 5.18-.21 3.04c.31 0 .44-.14.62-.31l1.47-1.43 3.07 2.27c.57.31.97.15 1.11-.52l1.94-9.64Z"
      />
    </svg>
  );
}

function ReminderLink({
  href,
  image,
  title,
  isMax = false,
  isTelegram = false,
}: {
  href: string | null;
  image?: string;
  title: string;
  isMax?: boolean;
  isTelegram?: boolean;
}) {
  const content = (
    <>
      <span className={`${v2.platformIcon} ${isMax ? v2.platformIconMax : ''}`}>
        {isTelegram ? (
          <TelegramReminderIcon />
        ) : (
          <Image
            src={image ?? ''}
            width={23}
            height={23}
            alt=""
            className={`${v2.platformIconImage} ${isMax ? v2.platformIconImageMax : ''}`}
          />
        )}
      </span>
      <span className={v2.platformText}>
        <strong>{title}</strong>
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
