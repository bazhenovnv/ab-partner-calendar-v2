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
  regions: string[];
  cities: string[];
  directions: string[];
  format: EventFormat | '';
  priceType: PriceType | '';
  autoStatus: EventAutoStatus[];
}

interface EventFiltersProps {
  cities: CityOption[];
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

export const EMPTY_EVENT_FILTERS: ActiveFilters = {
  regions: [],
  cities: [],
  directions: [],
  format: '',
  priceType: '',
  autoStatus: [],
};

interface CloseableMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

function useCloseableMenu({ isOpen, onClose }: CloseableMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  return containerRef;
}

function FilterChevron() {
  return (
    <svg className="pub-filter-multi-chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
      <path
        d="M1 1.5 6 6.5l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LocationMultiSelectProps {
  cities: CityOption[];
  selectedRegions: string[];
  selectedCities: string[];
  onChange: (regions: string[], cities: string[]) => void;
}

function LocationMultiSelect({
  cities,
  selectedRegions,
  selectedCities,
  onChange,
}: LocationMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  const containerRef = useCloseableMenu({ isOpen, onClose: closeMenu });
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
  const selectedLabels = [...selectedRegions, ...selectedCities];
  const selectionLabel = selectedLabels.length > 0
    ? selectedLabels.join(', ')
    : 'Все регионы';

  const toggleRegion = (region: string, regionCities: CityOption[]) => {
    if (selectedRegions.includes(region)) {
      onChange(selectedRegions.filter((item) => item !== region), selectedCities);
      return;
    }

    const cityNames = new Set(regionCities.map((city) => city.name));
    onChange(
      [...selectedRegions, region],
      selectedCities.filter((city) => !cityNames.has(city)),
    );
  };

  const toggleCity = (city: CityOption) => {
    const cityIsSelected = selectedCities.includes(city.name);
    onChange(
      selectedRegions.filter((region) => region !== city.region),
      cityIsSelected
        ? selectedCities.filter((item) => item !== city.name)
        : [...selectedCities, city.name],
    );
  };

  return (
    <div ref={containerRef} className="pub-filter-multi">
      <button
        id="filter-region"
        type="button"
        className="pub-filter-select pub-filter-multi-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="filter-region-menu"
        title={selectionLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="pub-filter-multi-value">{selectionLabel}</span>
        <FilterChevron />
      </button>

      {isOpen && (
        <div
          id="filter-region-menu"
          className="pub-filter-multi-menu pub-filter-location-menu"
          role="listbox"
          aria-label="Выберите регионы или города"
          aria-multiselectable="true"
        >
          <label className="pub-filter-multi-option" role="option" aria-selected={selectedLabels.length === 0}>
            <input
              type="checkbox"
              className="pub-filter-checkbox"
              checked={selectedLabels.length === 0}
              onChange={() => onChange([], [])}
            />
            <span>Все регионы</span>
          </label>

          {groupedCities.map(({ region, cities: regionCities }) => (
            <div key={region} className="pub-filter-location-group">
              <label
                className="pub-filter-multi-option pub-filter-location-region"
                role="option"
                aria-selected={selectedRegions.includes(region)}
              >
                <input
                  type="checkbox"
                  className="pub-filter-checkbox"
                  checked={selectedRegions.includes(region)}
                  onChange={() => toggleRegion(region, regionCities)}
                />
                <span>{region}</span>
              </label>
              {regionCities.map((city) => (
                <label
                  key={city.id}
                  className="pub-filter-multi-option pub-filter-location-city"
                  role="option"
                  aria-selected={selectedCities.includes(city.name)}
                >
                  <input
                    type="checkbox"
                    className="pub-filter-checkbox"
                    checked={selectedCities.includes(city.name)}
                    onChange={() => toggleCity(city)}
                  />
                  <span>{city.name}</span>
                </label>
              ))}
            </div>
          ))}

          {groupedCities.length === 0 && (
            <p className="pub-filter-multi-empty">Города пока не добавлены</p>
          )}
        </div>
      )}
    </div>
  );
}

interface DirectionMultiSelectProps {
  directions: DirectionOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

function DirectionMultiSelect({ directions, value, onChange }: DirectionMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  const containerRef = useCloseableMenu({ isOpen, onClose: closeMenu });
  const selectionLabel = value.length > 0
    ? value
      .map((slug) => directions.find((item) => item.slug === slug)?.name ?? slug)
      .join(', ')
    : 'Все направления';

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
        aria-controls="filter-direction-menu"
        title={selectionLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="pub-filter-multi-value">{selectionLabel}</span>
        <FilterChevron />
      </button>

      {isOpen && (
        <div
          id="filter-direction-menu"
          className="pub-filter-multi-menu"
          role="listbox"
          aria-label="Выберите одно или несколько направлений"
          aria-multiselectable="true"
        >
          <label className="pub-filter-multi-option" role="option" aria-selected={value.length === 0}>
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

export function EventFilters({ cities, directions, filters, onChange }: EventFiltersProps) {
  const [pending, setPending] = useState<ActiveFilters>(filters);

  useEffect(() => setPending(filters), [filters]);

  const hasFilters =
    pending.regions.length > 0 ||
    pending.cities.length > 0 ||
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
          <div className="pub-filter-section pub-filter-section--location">
            <label className="pub-filter-label" htmlFor="filter-region">Регион / Город</label>
            <LocationMultiSelect
              cities={cities}
              selectedRegions={pending.regions}
              selectedCities={pending.cities}
              onChange={(regions, selectedCities) => {
                setPending((current) => ({ ...current, regions, cities: selectedCities }));
              }}
            />
          </div>

          <div className="pub-filter-section pub-filter-section--direction">
            <label className="pub-filter-label" htmlFor="filter-direction">Направление</label>
            <DirectionMultiSelect
              directions={directions}
              value={pending.directions}
              onChange={(selectedDirections) => {
                setPending((current) => ({ ...current, directions: selectedDirections }));
              }}
            />
          </div>

          <div className="pub-filter-section pub-filter-section--format pub-filter-section--last">
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
          <div className="pub-filter-section pub-filter-section--status">
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

          <div className="pub-filter-section pub-filter-section--price pub-filter-section--last">
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
        <button
          type="button"
          className="pub-filter-reset-link"
          disabled={!hasFilters}
          onClick={() => { setPending(EMPTY_EVENT_FILTERS); onChange(EMPTY_EVENT_FILTERS); }}
        >
          ↺ Сбросить фильтр
        </button>
      </div>
    </div>
  );
}
