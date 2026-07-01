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
