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
  const res = await fetch(`${BACKEND}/api${path}`, {
    next: { revalidate: 60 },
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

export async function fetchCities(): Promise<CityOption[]> {
  return serverFetch<CityOption[]>('/filters/cities');
}
