import { api } from '@/lib/api';

const SESSION_KEY = 'ab_afisha_analytics_session';

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export function trackVisit(page: string): void {
  void api.post<{ id: string }>('/analytics/visit', {
    page,
    sessionId: getSessionId(),
  }).catch(() => undefined);
}

export function trackEventAction(
  eventId: string,
  action: 'view' | 'register' | 'ticket' | 'participate',
): void {
  void api.post<{ id: string }>(`/analytics/events/${encodeURIComponent(eventId)}`, {
    action,
    sessionId: getSessionId(),
  }).catch(() => undefined);
}
