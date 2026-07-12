'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { EventCard } from './EventCard';
import { EventGridSkeleton } from './EventCardSkeleton';
import { EventCalendar } from './EventCalendar';
import { EventFilters, type ActiveFilters } from './EventFilters';
import type { PublicEvent, PublicEventsResponse, DirectionOption } from '@/types/event';

const LIMIT = 6;

interface EventsSectionProps {
  initialData: PublicEventsResponse;
  directions: DirectionOption[];
}

export function EventsSection({ initialData, directions }: EventsSectionProps) {
  const [events, setEvents] = useState<PublicEvent[]>(initialData.events);
  const [total, setTotal] = useState(initialData.total);
  const [isFallback, setIsFallback] = useState(initialData.isFallback);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({
    directions: [],
    format: '',
    priceType: '',
    autoStatus: '',
  });
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(
    async (currentPage: number, currentDate: string | null, currentFilters: ActiveFilters) => {
      setIsLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('page', String(currentPage));
        qs.set('limit', String(LIMIT));
        if (currentDate) qs.set('date', currentDate);
        if (currentFilters.format) qs.set('format', currentFilters.format);
        if (currentFilters.priceType) qs.set('priceType', currentFilters.priceType);
        if (currentFilters.autoStatus) qs.set('autoStatus', currentFilters.autoStatus);
        currentFilters.directions.forEach((d) => qs.append('directions', d));

        const res = await fetch(`/api/events/public?${qs.toString()}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = (await res.json()) as PublicEventsResponse;
        setEvents(data.events);
        setTotal(data.total);
        setIsFallback(data.isFallback);
      } catch {
        // keep previous data
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleFilterChange = (newFilters: ActiveFilters) => {
    setFilters(newFilters);
    setPage(1);
    startTransition(() => {
      void fetchEvents(1, selectedDate, newFilters);
    });
  };

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);
    setPage(1);
    startTransition(() => {
      void fetchEvents(1, date, filters);
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    startTransition(() => {
      void fetchEvents(newPage, selectedDate, filters);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(total / LIMIT);
  const loading = isPending || isLoading;

  return (
    <section id="events" className="pub-events-section">
      <div className="pub-events-outer">
      {/* Controls row: filters left, calendar right */}
      <div className="pub-events-controls">
        <div className="pub-events-filters-col">
          <EventFilters
            directions={directions}
            filters={filters}
            onChange={handleFilterChange}
          />
        </div>
        <div className="pub-events-calendar-col">
          <EventCalendar
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
          />
        </div>
      </div>

      {/* Events grid — full width below controls */}
      <div className="flex flex-col gap-6 mt-8">
        {isFallback && !loading && (
          <div className="bg-primary/5 rounded-xl px-4 py-3 text-sm text-primary/70">
            Актуальных мероприятий пока нет — показываем последние завершённые.
          </div>
        )}

        {selectedDate && !loading && events.length > 0 && (
          <h2 className="pub-events-date-heading">
            События на {formatDateRu(selectedDate)}
          </h2>
        )}

        {loading ? (
          <EventGridSkeleton count={LIMIT} />
        ) : events.length === 0 ? (
          <EmptyState
            hasFilters={
              !!selectedDate ||
              filters.format !== '' ||
              filters.priceType !== '' ||
              filters.autoStatus !== '' ||
              filters.directions.length > 0
            }
            onReset={() => {
              setSelectedDate(null);
              handleFilterChange({ directions: [], format: '', priceType: '', autoStatus: '' });
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 tablet:grid-cols-2 wide:grid-cols-3 gap-[53px]">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}

            <p className="text-xs text-primary/40 text-right">
              Найдено: {total} мероприятий
            </p>
          </>
        )}
      </div>
      </div>
    </section>
  );
}

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
function formatDateRu(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]} ${y}`;
}

const TG_CHANNEL = 'https://t.me/ab_afisha_buh';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset?: () => void }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="13" cy="13" r="8" stroke="#0D2344" strokeWidth="1.4" strokeOpacity="0.35" />
            <path d="M19 19l4 4" stroke="#0D2344" strokeWidth="1.4" strokeOpacity="0.35" strokeLinecap="round" />
            <path d="M10 13h6M13 10v6" stroke="#0D2344" strokeWidth="1.4" strokeOpacity="0.3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-montserrat font-semibold text-primary text-lg mb-1">
          По вашим фильтрам ничего не найдено
        </p>
        <p className="text-sm text-primary/50 mb-5">
          Попробуйте изменить или сбросить параметры поиска
        </p>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-semibold text-selected-day hover:text-selected-day/80 active:text-selected-day/60 underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 rounded"
          >
            Сбросить все фильтры
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="empty-state-card">
      <div className="empty-state-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="12" width="36" height="30" rx="4" stroke="#0D2344" strokeWidth="1.8" strokeOpacity="0.18" />
          <path d="M15 6v12M33 6v12M6 24h36" stroke="#0D2344" strokeWidth="1.8" strokeOpacity="0.18" strokeLinecap="round" />
          <path d="M16 34l4 4 8-8" stroke="#7CD8B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="empty-state-title">Мероприятия скоро появятся</h3>
      <p className="empty-state-text">
        Мы готовим календарь вебинаров, семинаров и важных событий для бухгалтеров.
        Подпишитесь на канал, чтобы получить уведомление первым.
      </p>
      <div className="empty-state-actions">
        <a
          href={TG_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
          className="empty-state-btn-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
          </svg>
          Перейти в Telegram
        </a>
        <a
          href={PARTNER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="empty-state-btn-secondary"
        >
          Стать партнёром
        </a>
      </div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <nav aria-label="Страницы мероприятий" className="flex items-center justify-center gap-1 mt-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Предыдущая страница"
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors',
          currentPage === 1
            ? 'text-primary/20 cursor-not-allowed'
            : 'text-primary hover:bg-date-hover active:bg-date-hover/70',
        )}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-primary/30 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p as number)}
            aria-label={`Страница ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            className={cn(
              'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
              p === currentPage
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-date-hover active:bg-date-hover/70',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Следующая страница"
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors',
          currentPage === totalPages
            ? 'text-primary/20 cursor-not-allowed'
            : 'text-primary hover:bg-date-hover active:bg-date-hover/70',
        )}
      >
        ›
      </button>
    </nav>
  );
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
