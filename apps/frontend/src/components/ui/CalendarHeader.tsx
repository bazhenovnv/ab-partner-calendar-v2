'use client';

import { cn } from '@/lib/utils';

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export function CalendarHeader({ year, month, onPrev, onNext, className }: CalendarHeaderProps) {
  const monthName = MONTHS_RU[month];

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span
        className="font-montserrat text-primary text-[30px] leading-tight"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="font-semibold">{monthName}</span>{' '}
        <span className="font-normal">{year}</span>
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Предыдущий месяц"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-date-hover transition-colors text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Следующий месяц"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-date-hover transition-colors text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
