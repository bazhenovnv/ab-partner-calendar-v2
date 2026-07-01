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

  // Refetch when filters/date/page change (skip initial mount — we have SSR data)
  const isFirstMount = useCallback(() => false, []);
  void isFirstMount;

  useEffect(() => {
    // Don't fetch on initial render since we have SSR data
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 py-8 tablet:py-12">
      <div className="flex flex-col desktop:flex-row gap-8">
        {/* Sidebar: calendar */}
        <aside className="desktop:w-[320px] shrink-0">
          <EventCalendar
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
          />
          {selectedDate && (
            <p className="mt-3 text-sm text-primary/60 text-center">
              Показаны мероприятия на {selectedDate}
            </p>
          )}
        </aside>

        {/* Main: filters + list */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-montserrat font-bold text-primary text-2xl tablet:text-3xl mb-4">
                Мероприятия
              </h2>
              <EventFilters
                directions={directions}
                filters={filters}
                onChange={handleFilterChange}
              />
            </div>

            {isFallback && !loading && (
              <div className="bg-primary/5 rounded-xl px-4 py-3 text-sm text-primary/70">
                Актуальных мероприятий пока нет — показываем последние завершённые.
              </div>
            )}

            {loading ? (
              <EventGridSkeleton count={LIMIT} />
            ) : events.length === 0 ? (
              <EmptyState hasFilters={
                !!selectedDate ||
                filters.format !== '' ||
                filters.priceType !== '' ||
                filters.autoStatus !== '' ||
                filters.directions.length > 0
              } />
            ) : (
              <>
                <div className="grid grid-cols-1 tablet:grid-cols-2 wide:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="4" y="8" width="24" height="20" rx="3" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.3" />
          <path d="M10 4v8M22 4v8M4 16h24" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-montserrat font-semibold text-primary/60 text-lg mb-1">
        {hasFilters ? 'По вашим фильтрам ничего не найдено' : 'Мероприятий пока нет'}
      </p>
      <p className="text-sm text-primary/40">
        {hasFilters ? 'Попробуйте изменить или сбросить фильтры' : 'Загляните позже — скоро появятся новые события'}
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
          'w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors',
          currentPage === 1
            ? 'text-primary/20 cursor-not-allowed'
            : 'text-primary hover:bg-date-hover',
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
                : 'text-primary hover:bg-date-hover',
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
            : 'text-primary hover:bg-date-hover',
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
