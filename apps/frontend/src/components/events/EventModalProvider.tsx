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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const loadedEvent = (await response.json()) as PublicEvent;

      if (
        controller.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      setEvent(loadedEvent);
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return;
      }

      if (requestSequence === requestSequenceRef.current) {
        setLoadError(
          'Не удалось загрузить полную информацию о мероприятии.',
        );
      }
    } finally {
      if (
        !controller.signal.aborted &&
        requestSequence === requestSequenceRef.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  const openEvent = useCallback(
    (preview: PublicEvent) => {
      const activeElement = document.activeElement;

      returnFocusRef.current =
        activeElement instanceof HTMLElement ? activeElement : null;

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
      const returnTarget = returnFocusRef.current;

      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }

      returnFocusRef.current = null;
    });
  }, []);

  const retry = useCallback(() => {
    if (event) {
      void loadEvent(event);
    }
  }, [event, loadEvent]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!event) {
      return;
    }

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
          onRetry={retry}
          onClose={close}
        />
      )}
    </EventModalContext.Provider>
  );
}

function cleanSpeaker(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.split(/\s+[—–-]\s+/)[0]?.trim() || null;
}

function safeOrganizerUrl(event: PublicEvent): string | null {
  const candidate = event.ticketSalesEnabled
    ? event.ticketUrl
    : event.eventUrl;

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);

    if (
      url.hostname === 'max.ru' &&
      url.pathname.startsWith('/join/')
    ) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  ).filter((element) => {
    return (
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.offsetParent !== null
    );
  });
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 5h5.2a4 4 0 1 1 0 8H8m0-4h7M8 13v6m0-3h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="10"
        r="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 16.5h11l-1.2-1.7V10a4.3 4.3 0 0 0-8.6 0v4.8l-1.2 1.7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 19a2.2 2.2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface EventModalProps {
  event: PublicEvent;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onClose: () => void;
}

function EventModal({
  event,
  loading,
  loadError,
  onRetry,
  onClose,
}: EventModalProps) {
  const [reminderOpen, setReminderOpen] = useState(false);

  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reminderTriggerRef = useRef<HTMLButtonElement>(null);

  const image = event.images?.[0];
  const imageUrl =
    image?.modalUrl ??
    image?.originalUrl ??
    image?.mainEventUrl ??
    image?.eventCardUrl;

  const actionLabel = event.ticketSalesEnabled
    ? 'Купить билет'
    : 'Участвовать';

  const actionUrl = safeOrganizerUrl(event);

  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  }).format(new Date(event.startDate));

  const format =
    event.format === 'ONLINE'
      ? 'Онлайн'
      : event.cityName ?? event.city?.name ?? 'Офлайн';

  const price =
    event.priceType === 'FREE'
      ? 'Бесплатно'
      : event.priceText ?? 'Платно';

  const speaker = cleanSpeaker(event.speaker);
  const lead = event.shortDescription?.trim() ?? '';
  const description = event.fullDescription?.trim() ?? '';

  const status =
    event.autoStatus === 'LIVE'
      ? 'Идёт сейчас'
      : event.autoStatus === 'COMPLETED'
        ? 'Завершено'
        : 'Запланировано';

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const modal = modalRef.current;

    if (!modal) {
      return;
    }

    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();

        if (reminderOpen) {
          setReminderOpen(false);

          window.requestAnimationFrame(() => {
            reminderTriggerRef.current?.focus();
          });
        } else {
          onClose();
        }

        return;
      }

      if (keyboardEvent.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(modal);

      if (focusableElements.length === 0) {
        keyboardEvent.preventDefault();
        modal.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      if (
        keyboardEvent.shiftKey &&
        document.activeElement === firstElement
      ) {
        keyboardEvent.preventDefault();
        lastElement.focus();
      } else if (
        !keyboardEvent.shiftKey &&
        document.activeElement === lastElement
      ) {
        keyboardEvent.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, reminderOpen]);

  const closeReminder = useCallback(() => {
    setReminderOpen(false);

    window.requestAnimationFrame(() => {
      reminderTriggerRef.current?.focus();
    });
  }, []);

  const descriptionId =
    description || lead ? 'event-modal-description' : undefined;

  return (
    <div
      className={v2.backdrop}
      role="presentation"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          onClose();
        }
      }}
    >
      <article
        ref={modalRef}
        className={v2.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        aria-describedby={descriptionId}
        aria-busy={loading}
        tabIndex={-1}
      >
        <button
          ref={closeButtonRef}
          className={v2.close}
          type="button"
          onClick={onClose}
          aria-label="Закрыть информацию о мероприятии"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className={v2.media}>
          <div className={v2.imageStage}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={event.title}
                fill
                unoptimized
                priority
                className={v2.image}
              />
            ) : (
              <div
                className={v2.imagePlaceholder}
                aria-label="Изображение мероприятия отсутствует"
              >
                АБ
              </div>
            )}
          </div>
        </div>

        <div className={v2.content}>
          <span className={v2.status}>{status}</span>

          <h2 id="event-modal-title" className={v2.title}>
            {event.title}
          </h2>

          {lead && (
            <p
              id={!description ? 'event-modal-description' : undefined}
              className={v2.lead}
            >
              {lead}
            </p>
          )}

          <div className={v2.facts}>
            <div className={v2.fact}>
              <span className={v2.icon}>
                <CalendarIcon />
              </span>
              <span>
                <small className={v2.label}>Дата</small>
                <strong className={v2.value}>{date}</strong>
              </span>
            </div>

            <div className={v2.fact}>
              <span className={v2.icon}>
                <ClockIcon />
              </span>
              <span>
                <small className={v2.label}>Время</small>
                <strong className={v2.value}>
                  {event.startTime
                    ? `${event.startTime} (МСК)`
                    : 'Уточняется'}
                </strong>
              </span>
            </div>

            <div className={v2.fact}>
              <span className={v2.icon}>
                <PriceIcon />
              </span>
              <span>
                <small className={v2.label}>Стоимость</small>
                <strong className={v2.value}>{price}</strong>
              </span>
            </div>
          </div>

          <div className={v2.lines}>
            <span className={v2.detailLine}>
              <LocationIcon />
              <span>{format}</span>
            </span>

            {speaker && (
              <strong className={v2.detailLine}>
                <SpeakerIcon />
                <span>Спикер: {speaker}</span>
              </strong>
            )}
          </div>

          {description && (
            <div
              id="event-modal-description"
              className={v2.description}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}

          {loadError && (
            <div className={v2.loadError} role="alert">
              <p>{loadError}</p>
              <button
                type="button"
                className={v2.retry}
                onClick={onRetry}
                disabled={loading}
              >
                {loading ? 'Загрузка…' : 'Повторить'}
              </button>
            </div>
          )}

          <div className={v2.actions}>
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
                title="Ссылка организатора не указана"
              >
                {actionLabel}
              </button>
            )}

            <button
              ref={reminderTriggerRef}
              className={v2.remind}
              type="button"
              onClick={() => setReminderOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={reminderOpen}
            >
              <BellIcon />
              Напомнить
            </button>
          </div>

          {loading && (
            <div className={v2.loading} role="status" aria-live="polite">
              <span className={v2.spinner} aria-hidden="true" />
              <span>Обновляем данные…</span>
            </div>
          )}
        </div>

        {reminderOpen && (
          <ReminderChooser
            event={event}
            onClose={closeReminder}
          />
        )}
      </article>
    </div>
  );
}

function ReminderChooser({
  event,
  onClose,
}: {
  event: PublicEvent;
  onClose: () => void;
}) {
  const chooserRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const telegramUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
      ?.replace(/^@/, '')
      .trim();

  const maxUsername =
    process.env.NEXT_PUBLIC_MAX_BOT_USERNAME
      ?.replace(/^@/, '')
      .trim();

  const payload = `remind_${event.id}`;

  const telegramUrl = telegramUsername
    ? `https://t.me/${telegramUsername}?start=${encodeURIComponent(payload)}`
    : null;

  const maxUrl = maxUsername
    ? `https://max.ru/${maxUsername}?start=${encodeURIComponent(payload)}`
    : null;

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      className={v2.chooserOverlay}
      role="presentation"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={chooserRef}
        className={v2.chooser}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-dialog-title"
        aria-describedby="reminder-dialog-description"
      >
        <button
          ref={closeButtonRef}
          className={v2.chooserClose}
          type="button"
          onClick={onClose}
          aria-label="Закрыть выбор сервиса напоминания"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className={v2.chooserGraphic} aria-hidden="true">
          <CalendarIcon />
          <BellIcon />
        </div>

        <h3 id="reminder-dialog-title">Напомнить</h3>

        <p id="reminder-dialog-description">
          Выберите, куда отправить напоминание
        </p>

        <div className={v2.platforms}>
          {telegramUrl && (
            <a
              className={v2.platform}
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Telegram</span>
              <span aria-hidden="true">›</span>
            </a>
          )}

          {maxUrl && (
            <a
              className={v2.platform}
              href={maxUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>MAX</span>
              <span aria-hidden="true">›</span>
            </a>
          )}

          {!telegramUrl && !maxUrl && (
            <p className={v2.platformError} role="status">
              Сервисы напоминаний временно недоступны.
            </p>
          )}
        </div>

        <button
          className={v2.cancel}
          type="button"
          onClick={onClose}
        >
          Отмена
        </button>
      </section>
    </div>
  );
}
