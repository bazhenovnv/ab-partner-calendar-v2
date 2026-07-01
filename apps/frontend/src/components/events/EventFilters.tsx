'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { useDropdown } from '@/hooks/useDropdown';
import type { DirectionOption, EventAutoStatus, EventFormat, PriceType } from '@/types/event';

export interface ActiveFilters {
  directions: string[];
  format: EventFormat | '';
  priceType: PriceType | '';
  autoStatus: EventAutoStatus | '';
}

interface EventFiltersProps {
  directions: DirectionOption[];
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

const STATUS_OPTIONS: { value: EventAutoStatus | ''; label: string }[] = [
  { value: '', label: 'Все мероприятия' },
  { value: 'PLANNED', label: 'Предстоящие' },
  { value: 'LIVE', label: 'Идут сейчас' },
  { value: 'COMPLETED', label: 'Прошедшие' },
];

const FORMAT_OPTIONS: { value: EventFormat | ''; label: string }[] = [
  { value: '', label: 'Все форматы' },
  { value: 'ONLINE', label: 'Онлайн' },
  { value: 'OFFLINE', label: 'Офлайн' },
];

const PRICE_OPTIONS: { value: PriceType | ''; label: string }[] = [
  { value: '', label: 'Любая цена' },
  { value: 'FREE', label: 'Бесплатно' },
  { value: 'PAID', label: 'Платно' },
];

export function EventFilters({ directions, filters, onChange }: EventFiltersProps) {
  const statusDropdown = useDropdown();
  const formatDropdown = useDropdown();
  const priceDropdown = useDropdown();
  const dirDropdown = useDropdown();

  const update = useCallback(
    (partial: Partial<ActiveFilters>) => onChange({ ...filters, ...partial }),
    [filters, onChange],
  );

  const toggleDirection = useCallback(
    (slug: string) => {
      const next = filters.directions.includes(slug)
        ? filters.directions.filter((s) => s !== slug)
        : [...filters.directions, slug];
      update({ directions: next });
    },
    [filters.directions, update],
  );

  const hasActiveFilters =
    filters.autoStatus !== '' ||
    filters.format !== '' ||
    filters.priceType !== '' ||
    filters.directions.length > 0;

  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === filters.autoStatus)?.label ?? 'Статус';
  const formatLabel =
    FORMAT_OPTIONS.find((o) => o.value === filters.format)?.label ?? 'Формат';
  const priceLabel =
    PRICE_OPTIONS.find((o) => o.value === filters.priceType)?.label ?? 'Цена';
  const dirLabel =
    filters.directions.length > 0
      ? `Направления (${filters.directions.length})`
      : 'Направление';

  return (
    <div className="flex flex-wrap gap-2 items-center" role="search" aria-label="Фильтры мероприятий">
      <FilterDropdown
        label={statusLabel}
        isOpen={statusDropdown.isOpen}
        onToggle={statusDropdown.toggle}
        onClose={statusDropdown.close}
        className="w-full mobile:w-auto"
      >
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={filters.autoStatus === opt.value}
            onClick={() => { update({ autoStatus: opt.value as EventAutoStatus | '' }); statusDropdown.close(); }}
            className={cn(
              'w-full text-left px-4 py-2 text-sm transition-colors',
              filters.autoStatus === opt.value
                ? 'bg-primary/5 text-primary font-semibold'
                : 'text-primary hover:bg-date-hover',
            )}
          >
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      <FilterDropdown
        label={formatLabel}
        isOpen={formatDropdown.isOpen}
        onToggle={formatDropdown.toggle}
        onClose={formatDropdown.close}
        className="w-full mobile:w-auto"
      >
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={filters.format === opt.value}
            onClick={() => { update({ format: opt.value as EventFormat | '' }); formatDropdown.close(); }}
            className={cn(
              'w-full text-left px-4 py-2 text-sm transition-colors',
              filters.format === opt.value
                ? 'bg-primary/5 text-primary font-semibold'
                : 'text-primary hover:bg-date-hover',
            )}
          >
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      <FilterDropdown
        label={priceLabel}
        isOpen={priceDropdown.isOpen}
        onToggle={priceDropdown.toggle}
        onClose={priceDropdown.close}
        className="w-full mobile:w-auto"
      >
        {PRICE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={filters.priceType === opt.value}
            onClick={() => { update({ priceType: opt.value as PriceType | '' }); priceDropdown.close(); }}
            className={cn(
              'w-full text-left px-4 py-2 text-sm transition-colors',
              filters.priceType === opt.value
                ? 'bg-primary/5 text-primary font-semibold'
                : 'text-primary hover:bg-date-hover',
            )}
          >
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      {directions.length > 0 && (
        <FilterDropdown
          label={dirLabel}
          isOpen={dirDropdown.isOpen}
          onToggle={dirDropdown.toggle}
          onClose={dirDropdown.close}
          className="w-full mobile:w-auto"
        >
          {directions.map((dir) => {
            const selected = filters.directions.includes(dir.slug);
            return (
              <button
                key={dir.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => toggleDirection(dir.slug)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2',
                  selected
                    ? 'bg-primary/5 text-primary font-semibold'
                    : 'text-primary hover:bg-date-hover',
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                    selected ? 'bg-selected-day border-selected-day' : 'border-primary/30',
                  )}
                  aria-hidden="true"
                >
                  {selected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {dir.name}
              </button>
            );
          })}
        </FilterDropdown>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange({ directions: [], format: '', priceType: '', autoStatus: '' })}
          className="text-sm text-primary/50 hover:text-primary transition-colors px-2 py-1 underline underline-offset-2"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
