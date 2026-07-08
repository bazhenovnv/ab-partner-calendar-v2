const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function setToken(token: string) {
  localStorage.setItem('admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('admin_token');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ── types ──────────────────────────────────────────────────────────────────

export type BroadcastStatus =
  | 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'SENDING'
  | 'PAUSED' | 'SENT' | 'FAILED' | 'CANCELLED';

export type BroadcastChannel = 'TELEGRAM' | 'MAX' | 'ALL';

export interface BroadcastStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface Broadcast {
  id: string;
  title: string;
  messageText: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  channel: BroadcastChannel;
  audienceFilter: Record<string, unknown>;
  status: BroadcastStatus;
  scheduledAt: string | null;
  testSentAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: BroadcastStats;
}

export interface BroadcastRecipient {
  id: string;
  botUserId: string;
  channel: string;
  status: string;
  sentAt: string | null;
  failedAt: string | null;
  failReason: string | null;
  skippedReason: string | null;
  createdAt: string;
  botUser: { channel: string; externalId: string; username: string | null };
}

export interface BroadcastLog {
  id: string;
  level: string;
  message: string;
  payload: unknown;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Legal docs ─────────────────────────────────────────────────────────────

export type LegalDocType =
  | 'PRIVACY_POLICY'
  | 'USER_AGREEMENT'
  | 'PERSONAL_DATA_CONSENT'
  | 'COOKIE_POLICY'
  | 'BROADCAST_CONSENT';

export interface LegalDoc {
  id: string;
  type: LegalDocType;
  title: string;
  content: string;
  isDraft: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocVersion {
  id: string;
  docId: string;
  content: string;
  publishedAt: string;
  createdBy: string | null;
  createdAt: string;
}

// ── SiteConfig settings ────────────────────────────────────────────────────

export interface SiteConfigRow {
  key: string;
  value: unknown;
}

// ── Events ─────────────────────────────────────────────────────────────────

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVE' | 'NEEDS_ATTENTION' | 'DELETED';
export type EventAutoStatus = 'PLANNED' | 'LIVE' | 'COMPLETED';
export type EventFormat = 'ONLINE' | 'OFFLINE';
export type PriceType = 'FREE' | 'PAID';

export interface AdminEvent {
  id: string;
  title: string;
  status: EventStatus;
  autoStatus: EventAutoStatus;
  format: EventFormat;
  priceType: PriceType;
  priceText: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  cityId: string | null;
  cityName: string | null;
  address: string | null;
  venue: string | null;
  speaker: string | null;
  eventUrl: string | null;
  ticketUrl: string | null;
  ticketSalesEnabled: boolean;
  mainEvent: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  city: { name: string; region: string } | null;
  images: { thumbnailUrl?: string | null } | null;
  directions?: Array<{ direction: { id: string; name: string; slug: string } }>;
  tags?: Array<{ tag: string }>;
}

export interface AdminEventsResponse {
  events: AdminEvent[];
  total: number;
}

// ── Cities ──────────────────────────────────────────────────────────────────

export interface AdminCity {
  id: string;
  name: string;
  region: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: { events: number };
}

export interface AdminCitiesResponse {
  total: number;
  page: number;
  limit: number;
  cities: AdminCity[];
}

// ── Directions ──────────────────────────────────────────────────────────────

export interface AdminDirection {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: { events: number };
}

export interface AdminDirectionsResponse {
  total: number;
  page: number;
  limit: number;
  directions: AdminDirection[];
}

// ── Quotes ──────────────────────────────────────────────────────────────────

export interface AdminQuote {
  id: string;
  text: string;
  author: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  needsAttentionEvents: number;
  activeBroadcasts: number;
  totalBotUsers: number;
  pendingReminders: number;
  legalDrafts: number;
}

export interface DashboardNeedsAttention {
  id: string;
  title: string;
  updatedAt: string;
  cityName: string | null;
}

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  startDate: string;
  autoStatus: string;
  cityName: string | null;
  city: { name: string } | null;
}

export interface DashboardRecentBroadcast {
  id: string;
  title: string;
  status: BroadcastStatus;
  createdAt: string;
  scheduledAt: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  needsAttentionList: DashboardNeedsAttention[];
  upcomingEvents: DashboardUpcomingEvent[];
  recentBroadcasts: DashboardRecentBroadcast[];
}
