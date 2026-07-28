'use client';

import { useEffect, useState } from 'react';
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

const STATUS_OPTIONS: { value: EventAutoStatus; label: string; dotClass: string }[] = [
  { value: 'PLANNED', label: 'Запланировано', dotClass: 'bg-green-marker' },
  { value: 'LIVE', label: 'Идёт сейчас', dotClass: 'bg-live-status' },
  { value: 'COMPLETED', label: 'Завершено', dotClass: 'bg-completed-marker' },
];

const FORMAT_OPTIONS: { value: EventFormat; label: string }[] = [
  { value: 'ONLINE', label: 'Онлайн' },
  { value: 'OFFLINE', label: 'Офлайн' },
];

const PRICE_OPTIONS: { value: PriceType; label: string }[] = [
  { value: 'FREE', label: 'Бесплатно' },
  { value: 'PAID', label: 'Платно' },
];

const EMPTY: ActiveFilters = { directions: [], format: '', priceType: '', autoStatus: '' };

export function EventFilters({ directions, filters, onChange }: EventFiltersProps) {
  const [pending, setPending] = useState<ActiveFilters>(filters);

  useEffect(() => {
    setPending(filters);
  }, [filters]);

  const hasFilters =
    pending.directions.length > 0 ||
    pending.format !== '' ||
    pending.priceType !== '' ||
    pending.autoStatus !== '';

  const toggleFormat = (value: EventFormat) =>
    setPending((current) => ({ ...current, format: current.format === value ? '' : value }));

  const toggleStatus = (value: EventAutoStatus) =>
    setPending((current) => ({ ...current, autoStatus: current.autoStatus === value ? '' : value }));

  const togglePrice = (value: PriceType) =>
    setPending((current) => ({ ...current, priceType: current.priceType === value ? '' : value }));

  return (
    <div role="search" aria-label="Фильтры мероприятий" className="flex h-full flex-col">
      <h3 className="pub-filter-title">Фильтр мероприятий</h3>

      <div className="pub-filter-two-col">
        <div className="pub-filter-left-col">
          <div className="pub-filter-section">
            <label className="pub-filter-label" htmlFor="filter-region">
              Регион / Город
            </label>
            <select
              id="filter-region"
              className="pub-filter-select"
              disabled
              value=""
              onChange={() => undefined}
            >
              <option value="">Все регионы</option>
            </select>
          </div>

          <div className="pub-filter-section">
            <label className="pub-filter-label" htmlFor="filter-direction">
              Направление
            </label>
            <select
              id="filter-direction"
              className="pub-filter-select"
              value={pending.directions[0] ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setPending((current) => ({ ...current, directions: value ? [value] : [] }));
              }}
            >
              <option value="">Все направления</option>
              {directions.map((direction) => (
                <option key={direction.id} value={direction.slug}>
                  {direction.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="pub-filter-label">Формат</p>
            <div className="pub-filter-options">
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="pub-filter-check-row pub-filter-check-row--without-dot"
                >
                  <input
                    type="checkbox"
                    className="pub-filter-checkbox"
                    checked={pending.format === option.value}
                    onChange={() => toggleFormat(option.value)}
                  />
                  <span className="pub-filter-check-text">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="pub-filter-divider-v" aria-hidden="true" />

        <div className="pub-filter-right-col">
          <p className="pub-filter-label">Статус</p>
          <div className="pub-filter-options">
            {STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="pub-filter-check-row">
                <input
                  type="checkbox"
                  className="pub-filter-checkbox"
                  checked={pending.autoStatus === option.value}
                  onChange={() => toggleStatus(option.value)}
                />
                <span className="pub-filter-check-text">{option.label}</span>
                <span className={`pub-filter-dot ${option.dotClass}`} aria-hidden="true" />
              </label>
            ))}
          </div>

          <div className="pub-filter-divider-h" aria-hidden="true" />

          <p className="pub-filter-label">Стоимость</p>
          <div className="pub-filter-options">
            {PRICE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="pub-filter-check-row pub-filter-check-row--without-dot"
              >
                <input
                  type="checkbox"
                  className="pub-filter-checkbox"
                  checked={pending.priceType === option.value}
                  onChange={() => togglePrice(option.value)}
                />
                <span className="pub-filter-check-text">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          className="pub-filter-apply-btn"
          onClick={() => onChange(pending)}
        >
          Применить
        </button>

        {hasFilters && (
          <button
            type="button"
            className="pub-filter-reset-link"
            onClick={() => {
              setPending(EMPTY);
              onChange(EMPTY);
            }}
          >
            ↺ Сбросить фильтр
          </button>
        )}
      </div>
    </div>
  );
}
