'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CalendarHeader } from '@/components/ui/CalendarHeader';
import type { CalendarMarker } from '@/types/event';

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

interface EventCalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function EventCalendar({ selectedDate, onSelectDate }: EventCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [markers, setMarkers] = useState<CalendarMarker[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMarkers = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/public/calendar?year=${y}&month=${m + 1}`);
      if (res.ok) {
        const data = (await res.json()) as CalendarMarker[];
        setMarkers(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkers(year, month);
  }, [year, month, loadMarkers]);

  const goToPrev = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const goToNext = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const markerMap = new Map(markers.map((m) => [m.date, m]));

  const todayStr = toDateString(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="select-none flex flex-col h-full" style={{ gap: '29.002px' }}>
      <CalendarHeader
        year={year}
        month={month}
        onPrev={goToPrev}
        onNext={goToNext}
      />

      <div className="flex flex-col" style={{ gap: '9.355px' }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7" role="row" aria-label="Дни недели">
          {DAYS_RU.map((d, idx) => (
            <div
              key={d}
              className={cn(
                'text-center font-semibold text-primary/40',
                (idx === 5 || idx === 6) && 'text-primary/30',
              )}
              style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '19px' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date grid — square cells, full-fill selected day */}
        <div
          className={cn(
            'grid grid-cols-7 border-t border-l border-primary/[0.06] transition-opacity',
            loading && 'opacity-40',
          )}
          role="grid"
          aria-label="Календарь мероприятий"
        >
          {/* Previous-month filler cells */}
          {Array.from({ length: firstDow }).map((_, i) => {
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
            const prevDay = daysInPrevMonth - firstDow + i + 1;
            const isWeekendPrev = i === 5 || i === 6;
            return (
              <div
                key={`prev-${i}`}
                role="gridcell"
                aria-disabled="true"
                className={cn(
                  'relative aspect-square flex items-center justify-center border-r border-b border-primary/[0.06]',
                  isWeekendPrev && 'bg-mint/[0.10]',
                )}
              >
                <span
                  className="font-semibold text-primary/25"
                  style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '23px' }}
                >
                  {prevDay}
                </span>
              </div>
            );
          })}

          {/* Current-month cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toDateString(year, month, day);
            const marker = markerMap.get(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const hasEvents = !!marker;
            const colIndex = (firstDow + i) % 7;
            const isWeekend = colIndex === 5 || colIndex === 6;

            return (
              <div
                key={day}
                role="gridcell"
                className={cn(
                  'relative aspect-square flex items-center justify-center border-r border-b border-primary/[0.06]',
                  isWeekend && !isSelected && 'bg-mint/[0.10]',
                  isSelected && 'bg-selected-day',
                )}
              >
                <button
                  type="button"
                  aria-label={`${day} числа${hasEvents ? ', есть мероприятия' : ''}${isSelected ? ', выбрано' : ''}`}
                  aria-selected={isSelected}
                  onClick={() => onSelectDate(isSelected ? null : dateStr)}
                  disabled={!hasEvents && !isSelected}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-inset',
                    isSelected
                      ? 'text-white cursor-pointer'
                      : isToday
                      ? 'text-primary bg-primary/10 rounded-lg m-1'
                      : hasEvents
                      ? 'text-primary hover:bg-date-hover cursor-pointer'
                      : 'text-primary cursor-default',
                  )}
                  style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '23px' }}
                >
                  {day}
                  {/* Corner triangle event marker */}
                  {hasEvents && !isSelected && (
                    <span
                      className="absolute top-0 right-0 w-0 h-0"
                      aria-hidden="true"
                      style={{
                        borderTop: `10px solid ${
                          marker!.live > 0
                            ? 'var(--color-live-status)'
                            : marker!.planned > 0
                            ? 'var(--color-green-marker)'
                            : 'var(--color-completed-marker)'
                        }`,
                        borderLeft: '10px solid transparent',
                      }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-dropdown-border flex flex-wrap gap-3 text-xs text-primary/60">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-marker inline-block" aria-hidden="true" />
          Запланировано
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-live-status inline-block" aria-hidden="true" />
          Идёт сейчас
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-completed-marker inline-block" aria-hidden="true" />
          Завершено
        </span>
      </div>
    </div>
  );
}
