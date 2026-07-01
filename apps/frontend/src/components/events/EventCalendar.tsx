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
    <div className="bg-white rounded-2xl shadow-base border border-dropdown-border p-4 tablet:p-5 select-none">
      <CalendarHeader
        year={year}
        month={month}
        onPrev={goToPrev}
        onNext={goToNext}
        className="mb-4"
      />

      <div
        className="grid grid-cols-7 gap-0.5 mb-1"
        role="row"
        aria-label="Дни недели"
      >
        {DAYS_RU.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-primary/40 py-1">
            {d}
          </div>
        ))}
      </div>

      <div
        className={cn('grid grid-cols-7 gap-0.5 transition-opacity', loading && 'opacity-40')}
        role="grid"
        aria-label="Календарь мероприятий"
      >
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} role="gridcell" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateString(year, month, day);
          const marker = markerMap.get(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const hasEvents = !!marker;

          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              aria-label={`${day} числа${hasEvents ? ', есть мероприятия' : ''}${isSelected ? ', выбрано' : ''}`}
              aria-selected={isSelected}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={cn(
                'relative flex flex-col items-center justify-center aspect-square rounded-lg text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-1',
                isSelected
                  ? 'bg-selected-day text-white'
                  : isToday
                  ? 'bg-primary/10 text-primary'
                  : hasEvents
                  ? 'hover:bg-date-hover text-primary cursor-pointer'
                  : 'text-primary/30 cursor-default',
              )}
              disabled={!hasEvents && !isSelected}
            >
              {day}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                  {marker!.live > 0 && (
                    <span className="w-1 h-1 rounded-full bg-live-status" />
                  )}
                  {marker!.planned > 0 && (
                    <span className="w-1 h-1 rounded-full bg-green-marker" />
                  )}
                  {marker!.completed > 0 && (
                    <span className="w-1 h-1 rounded-full bg-completed-marker" />
                  )}
                </span>
              )}
            </button>
          );
        })}
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
