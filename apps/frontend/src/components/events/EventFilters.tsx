'use client';

import { useState, useEffect } from 'react';
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

  const toggleFormat = (val: EventFormat) =>
    setPending((p) => ({ ...p, format: p.format === val ? '' : val }));

  const toggleStatus = (val: EventAutoStatus) =>
    setPending((p) => ({ ...p, autoStatus: p.autoStatus === val ? '' : val }));

  const togglePrice = (val: PriceType) =>
    setPending((p) => ({ ...p, priceType: p.priceType === val ? '' : val }));

  return (
    <div role="search" aria-label="Фильтры мероприятий" className="flex flex-col h-full">
      <h3 className="pub-filter-title">Фильтр мероприятий</h3>

      {/* Two-col layout with vertical divider */}
      <div className="pub-filter-two-col">
        {/* LEFT: Регион / Направление / Формат */}
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
              onChange={(e) => {
                const v = e.target.value;
                setPending((p) => ({ ...p, directions: v ? [v] : [] }));
              }}
            >
              <option value="">Все направления</option>
              {directions.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="pub-filter-label">Формат</p>
            <div>
              {FORMAT_OPTIONS.map((opt) => (
                <label key={opt.value} className="pub-filter-check-row">
                  <input
                    type="checkbox"
                    className="pub-filter-checkbox"
                    checked={pending.format === opt.value}
                    onChange={() => toggleFormat(opt.value)}
                  />
                  <span className="pub-filter-check-text">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="pub-filter-divider-v" aria-hidden="true" />

        {/* RIGHT: Статус + Стоимость */}
        <div className="pub-filter-right-col">
          <p className="pub-filter-label">Статус</p>
          <div>
            {STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="pub-filter-check-row">
                <input
                  type="checkbox"
                  className="pub-filter-checkbox"
                  checked={pending.autoStatus === opt.value}
                  onChange={() => toggleStatus(opt.value)}
                />
                <span className="pub-filter-check-text">{opt.label}</span>
                <span className={`pub-filter-dot ${opt.dotClass}`} aria-hidden="true" />
              </label>
            ))}
          </div>

          <div className="pub-filter-divider-h" aria-hidden="true" />

          <p className="pub-filter-label">Стоимость</p>
          <div>
            {PRICE_OPTIONS.map((opt) => (
              <label key={opt.value} className="pub-filter-check-row">
                <input
                  type="checkbox"
                  className="pub-filter-checkbox"
                  checked={pending.priceType === opt.value}
                  onChange={() => togglePrice(opt.value)}
                />
                <span className="pub-filter-check-text">{opt.label}</span>
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
