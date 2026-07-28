'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  CityOption,
  DirectionOption,
  EventAutoStatus,
  EventFormat,
  PriceType,
} from '@/types/event';

export interface ActiveFilters {
  city: string;
  directions: string[];
  format: EventFormat | '';
  priceType: PriceType | '';
  autoStatus: EventAutoStatus[];
}

interface EventFiltersProps {
  directions: DirectionOption[];
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

const STATUS_OPTIONS: {
  value: EventAutoStatus;
  label: string;
  dotClass: string;
}[] = [
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

const EMPTY: ActiveFilters = {
  city: '',
  directions: [],
  format: '',
  priceType: '',
  autoStatus: [],
};

export function EventFilters({ directions, filters, onChange }: EventFiltersProps) {
  const [pending, setPending] = useState<ActiveFilters>(filters);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  useEffect(() => setPending(filters), [filters]);

  useEffect(() => {
    let active = true;

    async function loadCities() {
      try {
        const response = await fetch('/api/filters/cities');
        if (!response.ok) throw new Error(`Cities request failed: ${response.status}`);
        const data = (await response.json()) as CityOption[];
        if (active) setCities(data);
      } catch {
        if (active) setCities([]);
      } finally {
        if (active) setCitiesLoading(false);
      }
    }

    void loadCities();
    return () => { active = false; };
  }, []);

  const groupedCities = useMemo(() => {
    const groups = new Map<string, CityOption[]>();
    for (const city of cities) {
      const region = city.region?.trim() || 'Другие регионы';
      groups.set(region, [...(groups.get(region) ?? []), city]);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .map(([region, regionCities]) => ({
        region,
        cities: regionCities.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      }));
  }, [cities]);

  const hasFilters =
    pending.city !== '' ||
    pending.directions.length > 0 ||
    pending.format !== '' ||
    pending.priceType !== '' ||
    pending.autoStatus.length > 0;

  const toggleFormat = (value: EventFormat) => {
    setPending((current) => ({ ...current, format: current.format === value ? '' : value }));
  };

  const toggleStatus = (value: EventAutoStatus) => {
    setPending((current) => ({
      ...current,
      autoStatus: current.autoStatus.includes(value)
        ? current.autoStatus.filter((status) => status !== value)
        : [...current.autoStatus, value],
    }));
  };

  const togglePrice = (value: PriceType) => {
    setPending((current) => ({ ...current, priceType: current.priceType === value ? '' : value }));
  };

  return (
    <div role="search" aria-label="Фильтры мероприятий" className="pub-filter-root">
      <h3 className="pub-filter-title">Фильтр мероприятий</h3>

      <div className="pub-filter-two-col">
        <div className="pub-filter-left-col">
          <div className="pub-filter-section">
            <label className="pub-filter-label" htmlFor="filter-region">Регион / Город</label>
            <select
              id="filter-region"
              className="pub-filter-select"
              value={pending.city}
              disabled={citiesLoading}
              onChange={(event) => setPending((current) => ({ ...current, city: event.target.value }))}
            >
              <option value="">{citiesLoading ? 'Загрузка городов…' : 'Все регионы'}</option>
              {groupedCities.map(({ region, cities: regionCities }) => (
                <optgroup key={region} label={region}>
                  {regionCities.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="pub-filter-section">
            <label className="pub-filter-label" htmlFor="filter-direction">Направление</label>
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
                <option key={direction.id} value={direction.slug}>{direction.name}</option>
              ))}
            </select>
          </div>

          <div className="pub-filter-section pub-filter-section--last">
            <p className="pub-filter-label">Формат</p>
            <div className="pub-filter-options">
              {FORMAT_OPTIONS.map((option) => (
                <label key={option.value} className="pub-filter-check-row pub-filter-check-row--without-dot">
                  <input type="checkbox" className="pub-filter-checkbox" checked={pending.format === option.value} onChange={() => toggleFormat(option.value)} />
                  <span className="pub-filter-check-text">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="pub-filter-divider-v" aria-hidden="true" />

        <div className="pub-filter-right-col">
          <div className="pub-filter-section">
            <p className="pub-filter-label">Статус</p>
            <div className="pub-filter-options">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="pub-filter-check-row">
                  <input type="checkbox" className="pub-filter-checkbox" checked={pending.autoStatus.includes(option.value)} onChange={() => toggleStatus(option.value)} />
                  <span className="pub-filter-status-label">
                    <span className="pub-filter-check-text">{option.label}</span>
                    <span className={`pub-filter-dot ${option.dotClass}`} aria-hidden="true" />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pub-filter-divider-h" aria-hidden="true" />

          <div className="pub-filter-section pub-filter-section--last">
            <p className="pub-filter-label">Стоимость</p>
            <div className="pub-filter-options">
              {PRICE_OPTIONS.map((option) => (
                <label key={option.value} className="pub-filter-check-row pub-filter-check-row--without-dot">
                  <input type="checkbox" className="pub-filter-checkbox" checked={pending.priceType === option.value} onChange={() => togglePrice(option.value)} />
                  <span className="pub-filter-check-text">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pub-filter-actions">
        <button type="button" className="pub-filter-apply-btn" onClick={() => onChange(pending)}>Применить</button>
        {hasFilters && (
          <button
            type="button"
            className="pub-filter-reset-link"
            onClick={() => { setPending(EMPTY); onChange(EMPTY); }}
          >
            ↺ Сбросить фильтр
          </button>
        )}
      </div>
    </div>
  );
}
