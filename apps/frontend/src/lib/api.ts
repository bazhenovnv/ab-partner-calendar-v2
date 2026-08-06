import {
  extractCityFromEventLocation,
  isPlausibleCityName,
  normalizeLocationValue,
} from '@ab-afisha/shared';
import type {
  PublicEvent,
  PublicEventsResponse,
  CalendarMarker,
  DirectionOption,
  CityOption,
} from '@/types/event';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};

// ── Server-side fetch helpers (used in Server Components) ─────────────────

const BACKEND = process.env.BACKEND_URL ?? 'http://backend:3001';

async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasNoStore = (init as RequestInit & { cache?: string } | undefined)?.cache === 'no-store';
  const res = await fetch(`${BACKEND}/api${path}`, {
    ...(hasNoStore ? {} : { next: { revalidate: 60 } }),
    ...init,
  });
  if (!res.ok) throw new Error(`Backend ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchPublicEvents(
  params: Record<string, string | string[] | number | undefined> = {},
): Promise<PublicEventsResponse> {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === '') continue;
    if (Array.isArray(val)) {
      val.forEach((v) => qs.append(key, String(v)));
    } else {
      qs.set(key, String(val));
    }
  }
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return serverFetch<PublicEventsResponse>(`/events/public${query}`, { cache: 'no-store' });
}

export async function fetchMainEvents(): Promise<PublicEvent[]> {
  return serverFetch<PublicEvent[]>('/events/public/main');
}

export async function fetchEventById(id: string): Promise<PublicEvent> {
  return serverFetch<PublicEvent>(`/events/public/${id}`, { cache: 'no-store' });
}

export async function fetchCalendarMarkers(
  year: number,
  month: number,
): Promise<CalendarMarker[]> {
  return serverFetch<CalendarMarker[]>(
    `/events/public/calendar?year=${year}&month=${month}`,
    { cache: 'no-store' },
  );
}

export async function fetchDirections(): Promise<DirectionOption[]> {
  return serverFetch<DirectionOption[]>('/filters/directions');
}

const CITY_EVENT_PAGE_LIMIT = 50;
const CITY_EVENT_STATUSES = ['PLANNED', 'LIVE', 'COMPLETED'] as const;

async function fetchPublishedEventCityPage(page: number): Promise<PublicEventsResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(CITY_EVENT_PAGE_LIMIT),
  });
  CITY_EVENT_STATUSES.forEach((status) => qs.append('autoStatus', status));

  return serverFetch<PublicEventsResponse>(`/events/public?${qs.toString()}`);
}

async function fetchAllPublishedEventsForCities(): Promise<PublicEvent[]> {
  const firstPage = await fetchPublishedEventCityPage(1);
  const totalPages = Math.ceil(firstPage.total / CITY_EVENT_PAGE_LIMIT);
  if (totalPages <= 1) return firstPage.events;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchPublishedEventCityPage(index + 2),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.events);
}

interface CollectedCity {
  id: string;
  name: string;
  region: string;
  filterValues: Set<string>;
}

function buildPublishedEventCityOptions(
  events: PublicEvent[],
  catalogueCities: CityOption[],
): CityOption[] {
  const catalogueCandidates = catalogueCities
    .map((city) => ({ ...city, name: city.name.trim() }))
    .filter((city) => isPlausibleCityName(city.name))
    .sort((a, b) => b.name.length - a.name.length);
  const catalogueNames = catalogueCandidates.map((city) => city.name);
  const catalogueByName = new Map(
    catalogueCandidates.map((city) => [normalizeLocationValue(city.name), city]),
  );
  const collected = new Map<string, CollectedCity>();

  const addCity = (
    city: { id: string; name: string; region: string },
    rawValues: Array<string | null | undefined>,
  ) => {
    const name = city.name.trim().replace(/^(?:г\.|город)\s*/i, '').trim();
    const normalizedName = normalizeLocationValue(name);
    if (!name || !normalizedName || !isPlausibleCityName(name)) return;

    const values = [name, ...rawValues]
      .map((value) => value?.trim() ?? '')
      .filter(Boolean);

    const existing = collected.get(normalizedName);
    if (existing) {
      values.forEach((value) => existing.filterValues.add(value));
      return;
    }

    collected.set(normalizedName, {
      id: city.id,
      name,
      region: city.region.trim() || 'Другие регионы',
      filterValues: new Set(values),
    });
  };

  for (const event of events) {
    const rawValues = [event.cityName, event.address, event.venue];

    if (event.city?.name && isPlausibleCityName(event.city.name)) {
      addCity(
        {
          id: `event-city:${normalizeLocationValue(event.city.name)}`,
          name: event.city.name,
          region: event.city.region,
        },
        rawValues,
      );
      continue;
    }

    const cityName = extractCityFromEventLocation(
      {
        cityName: event.cityName,
        address: event.address,
        venue: event.venue,
      },
      catalogueNames,
    );
    if (!cityName) continue;

    const catalogueCity = catalogueByName.get(normalizeLocationValue(cityName));
    addCity(
      catalogueCity ?? {
        id: `event-city:${normalizeLocationValue(cityName)}`,
        name: cityName,
        region: 'Другие регионы',
      },
      rawValues,
    );
  }

  return Array.from(collected.values())
    .map((city) => ({
      id: city.id,
      name: city.name,
      region: city.region,
      filterValues: Array.from(city.filterValues).sort((a, b) => {
        if (a === city.name) return -1;
        if (b === city.name) return 1;
        return a.localeCompare(b, 'ru');
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export async function fetchCities(): Promise<CityOption[]> {
  const [events, catalogueCities] = await Promise.all([
    fetchAllPublishedEventsForCities(),
    serverFetch<CityOption[]>('/filters/cities').catch(() => []),
  ]);

  return buildPublishedEventCityOptions(events, catalogueCities);
}

export type PublicQuote = { id: string; text: string; author: string };

export async function fetchPublicQuotes(): Promise<PublicQuote[]> {
  try {
    return await serverFetch<PublicQuote[]>('/quotes/public');
  } catch {
    return [];
  }
}
