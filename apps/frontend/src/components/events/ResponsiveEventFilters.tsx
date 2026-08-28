'use client';

import { useId, useState } from 'react';
import type { CityOption, DirectionOption } from '@/types/event';
import { EventFilters, type ActiveFilters } from './EventFilters';

interface ResponsiveEventFiltersProps {
  cities: CityOption[];
  directions: DirectionOption[];
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

export function ResponsiveEventFilters({
  cities,
  directions,
  filters,
  onChange,
}: ResponsiveEventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const handleChange = (nextFilters: ActiveFilters) => {
    onChange(nextFilters);
    setIsOpen(false);
  };

  return (
    <div className="pub-filter-responsive">
      <button
        type="button"
        className="pub-filter-mobile-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Фильтр мероприятий</span>
        <svg
          className="pub-filter-mobile-toggle-icon"
          viewBox="0 0 18 11"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 1.5 9 9l7.5-7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        id={panelId}
        className={`pub-filter-mobile-panel${isOpen ? ' pub-filter-mobile-panel--open' : ''}`}
      >
        <EventFilters
          cities={cities}
          directions={directions}
          filters={filters}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
