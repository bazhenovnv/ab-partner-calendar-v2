'use client';

import { useState, useCallback, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { EventCard } from './EventCard';
import { EventGridSkeleton } from './EventCardSkeleton';
import { EventCalendar } from './EventCalendar';
import { EventFilters, type ActiveFilters } from './EventFilters';
import type { PublicEvent, PublicEventsResponse, DirectionOption } from '@/types/event';

const LIMIT = 6;
const EMPTY_FILTERS: ActiveFilters = {
  directions: [],
  format: '',
  priceType: '',
  autoStatus: '',
};

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
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
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
        currentFilters.directions.forEach((direction) => qs.append('directions', direction));

        const response = await fetch(`/api/events/public?${qs.toString()}`);
        if (!response.ok) throw new Error(`Events request failed: ${response.status}`);

        const data = (await response.json()) as PublicEventsResponse;
        setEvents(data.events);
        setTotal(data.total);
        setIsFallback(data.isFallback);
      } catch {
        setEvents([]);
        setTotal(0);
        setIsFallback(false);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleFilterChange = (nextFilters: ActiveFilters) => {
    setFilters(nextFilters);
    setPage(1);
    startTransition(() => void fetchEvents(1, selectedDate, nextFilters));
  };

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);
    setPage(1);
    startTransition(() => void fetchEvents(1, date, filters));
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    startTransition(() => void fetchEvents(nextPage, selectedDate, filters));
    document.getElementById('events-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetAll = () => {
    setSelectedDate(null);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    startTransition(() => void fetchEvents(1, null, EMPTY_FILTERS));
  };

  const totalPages = Math.ceil(total / LIMIT);
  const loading = isPending || isLoading;
  const hasNonDateFilters = Boolean(
    filters.format ||
    filters.priceType ||
    filters.autoStatus ||
    filters.directions.length,
  );

  return (
    <section id="events" className="pub-events-section">
      <div className="pub-events-outer">
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

        <div id="events-results" className="flex scroll-mt-6 flex-col gap-6 mt-8">
          {isFallback && !loading && (
            <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary/70">
              Актуальных мероприятий пока нет — показываем последние завершённые.
            </div>
          )}

          {selectedDate && !loading && (
            <h2 className="pub-events-date-heading">
              События на {formatDateRu(selectedDate)}
            </h2>
          )}

          {loading ? (
            <EventGridSkeleton count={LIMIT} />
          ) : events.length === 0 ? (
            selectedDate && !hasNonDateFilters ? (
              <DateEmptyState />
            ) : hasNonDateFilters || selectedDate ? (
              <FilterEmptyState onReset={resetAll} />
            ) : (
              <GlobalEmptyState />
            )
          ) : (
            <>
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[53px]">
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

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDateRu(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_RU[month - 1]} ${year}`;
}

function DateEmptyState() {
  return (
    <div className="flex min-h-[309px] items-center justify-center text-center" role="status">
      <p className="font-montserrat text-[30px] font-semibold text-[#b8b8b8]">Нет событий</p>
    </div>
  );
}

function FilterEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/5" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="13" cy="13" r="8" stroke="#0D2344" strokeWidth="1.4" strokeOpacity="0.35" />
          <path d="M19 19l4 4" stroke="#0D2344" strokeWidth="1.4" strokeOpacity="0.35" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mb-1 font-montserrat text-lg font-semibold text-primary">
        По вашим фильтрам ничего не найдено
      </p>
      <p className="mb-5 text-sm text-primary/50">
        Попробуйте изменить или сбросить параметры поиска
      </p>
      <button
        type="button"
        onClick={onReset}
        className="rounded text-sm font-semibold text-selected-day underline underline-offset-2 transition-colors hover:text-selected-day/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
      >
        Сбросить все фильтры
      </button>
    </div>
  );
}

function GlobalEmptyState() {
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
      </p>
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
          'flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors',
          currentPage === 1 ? 'cursor-not-allowed text-primary/20' : 'text-primary hover:bg-date-hover',
        )}
      >
        ‹
      </button>

      {pages.map((value, index) => value === '...' ? (
        <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-sm text-primary/30">…</span>
      ) : (
        <button
          key={value}
          type="button"
          onClick={() => onPageChange(value)}
          aria-current={value === currentPage ? 'page' : undefined}
          className={cn(
            'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
            value === currentPage ? 'bg-primary text-white' : 'text-primary hover:bg-date-hover',
          )}
        >
          {value}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Следующая страница"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors',
          currentPage === totalPages ? 'cursor-not-allowed text-primary/20' : 'text-primary hover:bg-date-hover',
        )}
      >
        ›
      </button>
    </nav>
  );
}

function getPaginationPages(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: Array<number | '...'> = [1];
  if (current > 3) pages.push('...');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) {
    pages.push(page);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
