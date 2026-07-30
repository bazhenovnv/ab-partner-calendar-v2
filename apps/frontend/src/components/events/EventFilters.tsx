'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  {
    value: 'PLANNED',
    label: 'Запланировано',
    dotClass: 'bg-green-marker',
  },
  {
    value: 'LIVE',
    label: 'Идёт сейчас',
    dotClass: 'bg-live-status',
  },
  {
    value: 'COMPLETED',
    label: 'Завершено',
    dotClass: 'bg-completed-marker',
  },
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

interface DirectionMultiSelectProps {
  directions: DirectionOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

function DirectionMultiSelect({
  directions,
  value,
  onChange,
}: DirectionMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDirections = useMemo(
    () =>
      value.map((slug) => {
        const direction = directions.find((item) => item.slug === slug);
        return direction?.name ?? slug;
      }),
    [directions, value],
  );
  const selectionLabel =
    selectedDirections.length > 0
      ? selectedDirections.join(', ')
      : 'Все направления';

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const toggleDirection = (slug: string) => {
    onChange(
      value.includes(slug)
        ? value.filter((selectedSlug) => selectedSlug !== slug)
        : [...value, slug],
    );
  };

  return (
    <div ref={containerRef} className="pub-filter-multi">
      <button
        id="filter-direction"
        type="button"
        className="pub-filter-select pub-filter-multi-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={selectionLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="pub-filter-multi-value">{selectionLabel}</span>
        <svg
          className="pub-filter-multi-chevron"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1.5 6 6.5l5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="pub-filter-multi-menu"
          role="listbox"
          aria-label="Выберите одно или несколько направлений"
          aria-multiselectable="true"
        >
          <label
            className="pub-filter-multi-option"
            role="option"
            aria-selected={value.length === 0}
          >
            <input
              type="checkbox"
              className="pub-filter-checkbox"
              checked={value.length === 0}
              onChange={() => onChange([])}
            />
            <span>Все направления</span>
          </label>

          {directions.map((direction) => (
            <label
              key={direction.id}
              className="pub-filter-multi-option"
              role="option"
              aria-selected={value.includes(direction.slug)}
            >
              <input
                type="checkbox"
                className="pub-filter-checkbox"
                checked={value.includes(direction.slug)}
                onChange={() => toggleDirection(direction.slug)}
              />
              <span>{direction.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventFilters({
  directions,
  filters,
  onChange,
}: EventFiltersProps) {
  const [pending, setPending] = useState<ActiveFilters>(filters);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  useEffect(() => {
    setPending(filters);
  }, [filters]);

  useEffect(() => {
    let active = true;

    async function loadCities() {
      try {
        const response = await fetch('/api/filters/cities');

        if (!response.ok) {
          throw new Error(`Cities request failed: ${response.status}`);
        }

        const data = (await response.json()) as CityOption[];

        if (active) {
          setCities(data);
        }
      } catch {
        if (active) {
          setCities([]);
        }
      } finally {
        if (active) {
          setCitiesLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      active = false;
    };
  }, []);

  const groupedCities = useMemo(() => {
    const groups = new Map<string, CityOption[]>();

    for (const city of cities) {
      const region = city.region?.trim() || 'Другие регионы';
      const list = groups.get(region) ?? [];
      list.push(city);
      groups.set(region, list);
    }

    return Array.from(groups.entries())
      .sort(([regionA], [regionB]) =>
        regionA.localeCompare(regionB, 'ru'),
      )
      .map(([region, regionCities]) => ({
        region,
        cities: regionCities.sort((a, b) =>
          a.name.localeCompare(b.name, 'ru'),
        ),
      }));
  }, [cities]);

  const hasFilters =
    pending.city !== '' ||
    pending.directions.length > 0 ||
    pending.format !== '' ||
    pending.priceType !== '' ||
    pending.autoStatus.length > 0;

  const toggleFormat = (value: EventFormat) => {
    setPending((current) => ({
      ...current,
      format: current.format === value ? '' : value,
    }));
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
    setPending((current) => ({
      ...current,
      priceType: current.priceType === value ? '' : value,
    }));
  };

  return (
    <div
      role="search"
      aria-label="Фильтры мероприятий"
      className="flex h-full flex-col"
    >
      <h3 className="pub-filter-title">Фильтр мероприятий</h3>

      <div className="pub-filter-two-col">
        <div className="pub-filter-left-col">
          <div className="pub-filter-section">
            <label
              className="pub-filter-label"
              htmlFor="filter-region"
            >
              Регион / Город
            </label>

            <select
              id="filter-region"
              className="pub-filter-select"
              value={pending.city}
              disabled={citiesLoading}
              onChange={(event) => {
                setPending((current) => ({
                  ...current,
                  city: event.target.value,
                }));
              }}
            >
              <option value="">
                {citiesLoading ? 'Загрузка городов…' : 'Все регионы'}
              </option>

              {groupedCities.map(({ region, cities: regionCities }) => (
                <optgroup key={region} label={region}>
                  {regionCities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="pub-filter-section">
            <label
              className="pub-filter-label"
              htmlFor="filter-direction"
            >
              Направление
            </label>

            <DirectionMultiSelect
              directions={directions}
              value={pending.directions}
              onChange={(selectedDirections) => {
                setPending((current) => ({
                  ...current,
                  directions: selectedDirections,
                }));
              }}
            />
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
                  <span className="pub-filter-check-text">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          className="pub-filter-divider-v"
          aria-hidden="true"
        />

        <div className="pub-filter-right-col">
          <p className="pub-filter-label">Статус</p>

          <div className="pub-filter-options">
              {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="pub-filter-check-row"
              >
                <input
                  type="checkbox"
                  className="pub-filter-checkbox"
                  checked={pending.autoStatus.includes(option.value)}
                  onChange={() => toggleStatus(option.value)}
                />

                <span className="pub-filter-check-text">
                  {option.label}
                </span>

                <span
                  className={`pub-filter-dot ${option.dotClass}`}
                  aria-hidden="true"
                />
              </label>
            ))}
          </div>

          <div
            className="pub-filter-divider-h"
            aria-hidden="true"
          />

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

                <span className="pub-filter-check-text">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="pub-filter-actions">
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
