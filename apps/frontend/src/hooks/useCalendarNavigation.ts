'use client';

import { useState, useCallback } from 'react';

interface CalendarState {
  year: number;
  month: number;
}

export function useCalendarNavigation(initialYear?: number, initialMonth?: number): {
  year: number;
  month: number;
  goToPrev: () => void;
  goToNext: () => void;
} {
  const now = new Date();
  const [state, setState] = useState<CalendarState>({
    year: initialYear ?? now.getFullYear(),
    month: initialMonth ?? now.getMonth(),
  });

  const goToPrev = useCallback(() => {
    setState(({ year, month }) =>
      month === 0
        ? { year: year - 1, month: 11 }
        : { year, month: month - 1 }
    );
  }, []);

  const goToNext = useCallback(() => {
    setState(({ year, month }) =>
      month === 11
        ? { year: year + 1, month: 0 }
        : { year, month: month + 1 }
    );
  }, []);

  return { year: state.year, month: state.month, goToPrev, goToNext };
}
