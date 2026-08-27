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

const NON_CITY_LOCATION_VALUES = new Set([
  'онлайн',
  'online',
  'очно',
  'офлайн',
  'offline',
  'дистанционно',
]);

const NON_CITY_MARKERS = [
  'центр',
  'отель',
  'гостиниц',
  'конференц',
  'офис',
  'зал',
  'площадк',
  'рбк',
  'адрес',
  'улиц',
  'ул.',
  'проспект',
  'пр-т',
  'переул',
  'пер.',
  'проезд',
  'шоссе',
  'набереж',
  'наб.',
  'дом ',
  'д. ',
  'корпус',
  'корп.',
  'строен',
  'стр.',
];

function normalizeLocationValue(value: string) {
  return value
    .trim()
    .replace(/^(?:г\.|город)\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru');
}

function splitLocationParts(value: string) {
  return value
    .split(/\s*(?:,|;|\||—|–)\s*|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isPublicCityName(value: string) {
  const name = value.trim();
  const normalized = normalizeLocationValue(name);

  if (!name || !normalized || NON_CITY_LOCATION_VALUES.has(normalized)) return false;
  if (splitLocationParts(name).length !== 1) return false;
  if (/\d/.test(name)) return false;
  if (NON_CITY_MARKERS.some((marker) => normalized.includes(marker))) return false;

  return true;
}

export async function fetchCities(): Promise<CityOption[]> {
  const catalogueCities = await serverFetch<CityOption[]>('/filters/cities', {
    cache: 'no-store',
  });
  const uniqueCities = new Map<string, CityOption>();

  for (const city of catalogueCities) {
    const name = city.name.trim().replace(/^(?:г\.|город)\s*/i, '').trim();
    if (!isPublicCityName(name)) continue;

    const normalizedName = normalizeLocationValue(name);
    const existing = uniqueCities.get(normalizedName);
    if (existing) continue;

    const filterValues = Array.from(
      new Set(
        [name, ...(city.filterValues ?? [])]
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    uniqueCities.set(normalizedName, {
      ...city,
      name,
      region: city.region?.trim() || 'Другие регионы',
      filterValues,
    });
  }

  return Array.from(uniqueCities.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  );
}

export type PublicQuote = { id: string; text: string; author: string };

export async function fetchPublicQuotes(): Promise<PublicQuote[]> {
  try {
    return await serverFetch<PublicQuote[]>('/quotes/public');
  } catch {
    return [];
  }
}
