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

const NON_CITY_VALUES = new Set([
  'онлайн',
  'online',
  'очно',
  'офлайн',
  'offline',
  'дистанционно',
]);

export const EMPTY_EVENT_FILTERS: ActiveFilters = {
  regions: [],
  cities: [],
  directions: [],
  format: '',
  priceType: '',
  autoStatus: [],
};

function useCloseableMenu(isOpen: boolean, onClose: () => void) {
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
      <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CityFilterOption {
  id: string;
  name: string;
  values: string[];
}

function LocationMultiSelect({
  cities,
  selectedCities,
  onChange,
}: {
  cities: CityOption[];
  selectedCities: string[];
  onChange: (cities: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  const containerRef = useCloseableMenu(isOpen, closeMenu);
  const availableCities = useMemo(() => {
    const uniqueCities = new Map<string, CityFilterOption>();
    for (const city of cities) {
      const name = city.name.trim();
      const normalizedName = name.toLocaleLowerCase('ru');
      if (!name || NON_CITY_VALUES.has(normalizedName)) continue;
      const values = Array.from(new Set([name, ...(city.filterValues ?? [])].map((value) => value.trim()).filter(Boolean)));
      const existing = uniqueCities.get(normalizedName);
      if (existing) existing.values = Array.from(new Set([...existing.values, ...values]));
      else uniqueCities.set(normalizedName, { id: city.id, name, values });
    }
    return Array.from(uniqueCities.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [cities]);

  const selectedLabels = availableCities
    .filter((city) => city.values.some((value) => selectedCities.includes(value)))
    .map((city) => city.name);
  const selectionLabel = selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Все города';

  const toggleCity = (city: CityFilterOption) => {
    const cityValues = new Set(city.values);
    const selected = city.values.some((value) => selectedCities.includes(value));
    onChange(selected
      ? selectedCities.filter((item) => !cityValues.has(item))
      : Array.from(new Set([...selectedCities, ...city.values])));
  };

  return (
    <div ref={containerRef} className="pub-filter-multi">
      <button id="filter-region" type="button" className="pub-filter-select pub-filter-multi-trigger" aria-haspopup="listbox" aria-expanded={isOpen} aria-controls="filter-region-menu" title={selectionLabel} onClick={() => setIsOpen((current) => !current)}>
        <span className="pub-filter-multi-value">{selectionLabel}</span>
        <FilterChevron />
      </button>
      {isOpen && (
        <div id="filter-region-menu" className="pub-filter-multi-menu pub-filter-location-menu" role="listbox" aria-label="Выберите города" aria-multiselectable="true">
          <label className="pub-filter-multi-option" role="option" aria-selected={selectedCities.length === 0}>
            <input type="checkbox" className="pub-filter-checkbox" checked={selectedCities.length === 0} onChange={() => onChange([])} />
            <span>Все</span>
          </label>
          {availableCities.map((city) => {
            const selected = city.values.some((value) => selectedCities.includes(value));
            return (
              <label key={city.id} className="pub-filter-multi-option" role="option" aria-selected={selected}>
                <input type="checkbox" className="pub-filter-checkbox" checked={selected} onChange={() => toggleCity(city)} />
                <span>{city.name}</span>
              </label>
            );
          })}
          {availableCities.length === 0 && (
            <p className="pub-filter-multi-empty">По выбранным фильтрам городов нет</p>
          )}
        </div>
      )}
    </div>
  );
}

function DirectionMultiSelect({ directions, value, onChange }: {
  directions: DirectionOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  const containerRef = useCloseableMenu(isOpen, closeMenu);
  const selectionLabel = value.length > 0
    ? value.map((slug) => directions.find((item) => item.slug === slug)?.name ?? slug).join(', ')
    : 'Все направления';
  const toggleDirection = (slug: string) => onChange(
    value.includes(slug) ? value.filter((item) => item !== slug) : [...value, slug],
  );

  return (
    <div ref={containerRef} className="pub-filter-multi">
      <button id="filter-direction" type="button" className="pub-filter-select pub-filter-multi-trigger" aria-haspopup="listbox" aria-expanded={isOpen} aria-controls="filter-direction-menu" title={selectionLabel} onClick={() => setIsOpen((current) => !current)}>
        <span className="pub-filter-multi-value">{selectionLabel}</span>
        <FilterChevron />
      </button>
      {isOpen && (
        <div id="filter-direction-menu" className="pub-filter-multi-menu" role="listbox" aria-label="Выберите одно или несколько направлений" aria-multiselectable="true">
          <label className="pub-filter-multi-option" role="option" aria-selected={value.length === 0}>
            <input type="checkbox" className="pub-filter-checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            <span>Все направления</span>
          </label>
          {directions.map((direction) => (
            <label key={direction.id} className="pub-filter-multi-option" role="option" aria-selected={value.includes(direction.slug)}>
              <input type="checkbox" className="pub-filter-checkbox" checked={value.includes(direction.slug)} onChange={() => toggleDirection(direction.slug)} />
              <span>{direction.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizedCityName(value: string) {
  return value.trim().replace(/^(?:г\.|город)\s*/i, '').trim().toLocaleLowerCase('ru');
}

interface FacetResponse {
  cities: Array<{ id: string; name: string; region: string }>;
  statuses: EventAutoStatus[];
}

export function EventFilters({ cities, directions, filters, onChange }: EventFiltersProps) {
  const [pending, setPending] = useState<ActiveFilters>(filters);
  const [facetCities, setFacetCities] = useState<CityOption[]>(cities);
  const [availableStatuses, setAvailableStatuses] = useState<Set<EventAutoStatus>>(
    () => new Set(STATUS_OPTIONS.map((option) => option.value)),
  );

  useEffect(() => setPending(filters), [filters]);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams();
    pending.cities.forEach((city) => qs.append('cities', city));
    pending.directions.forEach((direction) => qs.append('directions', direction));
    pending.autoStatus.forEach((status) => qs.append('autoStatus', status));
    if (pending.format) qs.set('format', pending.format);
    if (pending.priceType) qs.set('priceType', pending.priceType);

    void fetch(`/api/filters/facets?${qs.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Facets request failed: ${response.status}`);
        return response.json() as Promise<FacetResponse>;
      })
      .then((facets) => {
        const allowedNames = new Set(facets.cities.map((city) => normalizedCityName(city.name)));
        const nextCities = cities.filter((city) => allowedNames.has(normalizedCityName(city.name)));
        const allowedCityValues = new Set(nextCities.flatMap((city) => [city.name, ...(city.filterValues ?? [])]));
        const nextStatuses = new Set(facets.statuses);

        setFacetCities(nextCities);
        setAvailableStatuses(nextStatuses);
        setPending((current) => {
          const selectedCities = current.cities.filter((city) => allowedCityValues.has(city));
          const selectedStatuses = current.autoStatus.filter((status) => nextStatuses.has(status));
          if (selectedCities.length === current.cities.length && selectedStatuses.length === current.autoStatus.length) return current;
          return { ...current, regions: [], cities: selectedCities, autoStatus: selectedStatuses };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFacetCities(cities);
        setAvailableStatuses(new Set(STATUS_OPTIONS.map((option) => option.value)));
      });

    return () => controller.abort();
  }, [cities, pending.cities, pending.directions, pending.autoStatus, pending.format, pending.priceType]);

  const hasFilters = pending.regions.length > 0 || pending.cities.length > 0 || pending.directions.length > 0 || pending.format !== '' || pending.priceType !== '' || pending.autoStatus.length > 0;
  const toggleFormat = (value: EventFormat) => setPending((current) => ({ ...current, format: current.format === value ? '' : value }));
  const togglePrice = (value: PriceType) => setPending((current) => ({ ...current, priceType: current.priceType === value ? '' : value }));
  const toggleStatus = (value: EventAutoStatus) => {
    if (!availableStatuses.has(value) && !pending.autoStatus.includes(value)) return;
    setPending((current) => ({
      ...current,
      autoStatus: current.autoStatus.includes(value)
        ? current.autoStatus.filter((status) => status !== value)
        : [...current.autoStatus, value],
    }));
  };

  return (
    <div role="search" aria-label="Фильтры мероприятий" className="pub-filter-root">
      <h3 className="pub-filter-title">Фильтр мероприятий</h3>
      <div className="pub-filter-two-col">
        <div className="pub-filter-left-col">
          <div className="pub-filter-section pub-filter-section--location">
            <label className="pub-filter-label" htmlFor="filter-region">Регион / Город</label>
            <LocationMultiSelect cities={facetCities} selectedCities={pending.cities} onChange={(selectedCities) => setPending((current) => ({ ...current, regions: [], cities: selectedCities }))} />
          </div>
          <div className="pub-filter-section pub-filter-section--direction">
            <label className="pub-filter-label" htmlFor="filter-direction">Направление</label>
            <DirectionMultiSelect directions={directions} value={pending.directions} onChange={(selectedDirections) => setPending((current) => ({ ...current, directions: selectedDirections }))} />
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
              {STATUS_OPTIONS.map((option) => {
                const unavailable = !availableStatuses.has(option.value) && !pending.autoStatus.includes(option.value);
                return (
                  <label key={option.value} className="pub-filter-check-row" aria-disabled={unavailable}>
                    <input type="checkbox" className="pub-filter-checkbox" checked={pending.autoStatus.includes(option.value)} disabled={unavailable} onChange={() => toggleStatus(option.value)} />
                    <span className="pub-filter-status-label">
                      <span className="pub-filter-check-text">{option.label}</span>
                      <span className={`pub-filter-dot ${option.dotClass}`} aria-hidden="true" />
                    </span>
                  </label>
                );
              })}
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
        <button type="button" className="pub-filter-reset-link" disabled={!hasFilters} onClick={() => { setPending(EMPTY_EVENT_FILTERS); onChange(EMPTY_EVENT_FILTERS); }}>
          ↺ Сбросить фильтр
        </button>
      </div>
    </div>
  );
}
