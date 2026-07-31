'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function pluralizeEvents(value: number): string {
  const mod100 = value % 100;
  const mod10 = value % 10;

  if (mod100 >= 11 && mod100 <= 14) return 'мероприятий';
  if (mod10 === 1) return 'мероприятие';
  if (mod10 >= 2 && mod10 <= 4) return 'мероприятия';
  return 'мероприятий';
}

function getMarkerTotal(marker?: CalendarMarker): number {
  if (!marker) return 0;
  return marker.planned + marker.live + marker.completed;
}

function getCalendarTooltip(marker?: CalendarMarker): string {
  const total = getMarkerTotal(marker);
  if (total === 0) return 'Мероприятий нет';

  const details = [
    marker!.planned > 0 ? `Запланировано: ${marker!.planned}` : null,
    marker!.live > 0 ? `Идёт сейчас: ${marker!.live}` : null,
    marker!.completed > 0 ? `Завершено: ${marker!.completed}` : null,
  ].filter(Boolean);

  return `${total} ${pluralizeEvents(total)} · ${details.join(' · ')}`;
}

export function EventCalendar({ selectedDate, onSelectDate }: EventCalendarProps) {
  const [today] = useState(() => new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [markers, setMarkers] = useState<CalendarMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const initializedToday = useRef(false);

  const loadMarkers = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/public/calendar?year=${y}&month=${m + 1}`);
      if (res.ok) {
        const data = (await res.json()) as CalendarMarker[];
        setMarkers(data);
      }
    } catch {
      // The displayed month remains selectable if marker loading fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkers(year, month);
  }, [year, month, loadMarkers]);

  useEffect(() => {
    if (initializedToday.current || selectedDate) return;
    initializedToday.current = true;
    onSelectDate(toDateString(today.getFullYear(), today.getMonth(), today.getDate()));
  }, [onSelectDate, selectedDate, today]);

  const scrollToSelectedDateResults = () => {
    window.setTimeout(() => {
      const target =
        document.querySelector<HTMLElement>('.pub-events-date-heading, .empty-state-card') ??
        document.getElementById('events');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 260);
  };

  const selectDate = (date: string | null) => {
    onSelectDate(date);
    if (date) scrollToSelectedDateResults();
  };

  const goToPrev = () => {
    if (month === 0) {
      setYear((value) => value - 1);
      setMonth(11);
    } else {
      setMonth((value) => value - 1);
    }
  };

  const goToNext = () => {
    if (month === 11) {
      setYear((value) => value + 1);
      setMonth(0);
    } else {
      setMonth((value) => value + 1);
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const occupiedCells = firstDow + daysInMonth;
  const totalCells = Math.ceil(occupiedCells / 7) * 7;
  const trailingCells = totalCells - occupiedCells;
  const markerMap = useMemo(
    () => new Map(markers.map((marker) => [marker.date, marker])),
    [markers],
  );

  return (
    <div className="pub-calendar select-none">
      <CalendarHeader year={year} month={month} onPrev={goToPrev} onNext={goToNext} />

      <div className="pub-calendar-table">
        <div className="pub-calendar-weekdays" role="row" aria-label="Дни недели">
          {DAYS_RU.map((day, index) => (
            <div
              key={day}
              className={cn(
                'pub-calendar-weekday',
                index >= 5 && 'pub-calendar-weekday--weekend',
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          className={cn('pub-calendar-grid', loading && 'pub-calendar-grid--loading')}
          role="grid"
          aria-label="Календарь мероприятий"
          aria-busy={loading}
        >
          {Array.from({ length: firstDow }).map((_, index) => {
            const previousMonth = month === 0 ? 11 : month - 1;
            const previousYear = month === 0 ? year - 1 : year;
            const previousMonthDays = getDaysInMonth(previousYear, previousMonth);
            const previousDay = previousMonthDays - firstDow + index + 1;
            const isWeekend = index >= 5;

            return (
              <div
                key={`previous-${index}`}
                role="gridcell"
                aria-disabled="true"
                className={cn(
                  'pub-calendar-cell pub-calendar-cell--outside',
                  isWeekend && 'pub-calendar-cell--weekend',
                )}
              >
                {previousDay}
              </div>
            );
          })}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateStr = toDateString(year, month, day);
            const marker = markerMap.get(dateStr);
            const isSelected = selectedDate === dateStr;
            const hasEvents = getMarkerTotal(marker) > 0;
            const columnIndex = (firstDow + index) % 7;
            const isWeekend = columnIndex >= 5;
            const tooltip = getCalendarTooltip(marker);
            const tooltipId = `calendar-tooltip-${dateStr}`;

            return (
              <div
                key={day}
                role="gridcell"
                className={cn(
                  'pub-calendar-cell',
                  isWeekend && !isSelected && 'pub-calendar-cell--weekend',
                  isSelected && 'pub-calendar-cell--selected',
                )}
              >
                <button
                  type="button"
                  aria-label={`${day} числа, ${tooltip.toLowerCase()}${isSelected ? ', выбрано' : ''}`}
                  aria-describedby={tooltipId}
                  aria-selected={isSelected}
                  onClick={() => selectDate(isSelected ? null : dateStr)}
                  className={cn(
                    'pub-calendar-day',
                    isSelected && 'pub-calendar-day--selected',
                    hasEvents && !isSelected && 'pub-calendar-day--event',
                  )}
                >
                  <span className="pub-calendar-day-number">{day}</span>
                  {hasEvents && !isSelected && (
                    <span
                      className="pub-calendar-marker"
                      aria-hidden="true"
                      style={{
                        borderTopColor:
                          marker!.live > 0
                            ? 'var(--color-live-status)'
                            : marker!.planned > 0
                              ? 'var(--color-green-marker)'
                              : 'var(--color-completed-marker)',
                      }}
                    />
                  )}
                  <span id={tooltipId} className="pub-calendar-tooltip" role="tooltip">
                    {tooltip}
                  </span>
                </button>
              </div>
            );
          })}

          {Array.from({ length: trailingCells }).map((_, index) => {
            const columnIndex = (occupiedCells + index) % 7;
            return (
              <div
                key={`next-${index}`}
                role="gridcell"
                aria-disabled="true"
                className={cn(
                  'pub-calendar-cell pub-calendar-cell--outside',
                  columnIndex >= 5 && 'pub-calendar-cell--weekend',
                )}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pub-calendar-legend">
        <span>
          <i className="pub-calendar-legend-dot bg-green-marker" />Запланировано
        </span>
        <span>
          <i className="pub-calendar-legend-dot bg-live-status" />Идёт сейчас
        </span>
        <span>
          <i className="pub-calendar-legend-dot bg-completed-marker" />Завершено
        </span>
      </div>
    </div>
  );
}
