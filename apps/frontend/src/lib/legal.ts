import { LEGAL_DOCUMENTS, type LegalDocType } from '@ab-afisha/shared';

export interface LegalDocItem {
  type: LegalDocType;
  title: string;
  content: string;
  publishedAt: string | null;
}

/** Displayed in footer and legal section — all 5 documents (BR-027) */
export const LEGAL_LINKS: { type: LegalDocType; label: string; href: string }[] = [
  { type: 'PRIVACY_POLICY',       label: 'Политика конфиденциальности',             href: '/legal/privacy' },
  { type: 'USER_AGREEMENT',       label: 'Пользовательское соглашение',             href: '/legal/terms' },
  { type: 'PERSONAL_DATA_CONSENT',label: 'Согласие на обработку персональных данных', href: '/legal/consent' },
  { type: 'COOKIE_POLICY',        label: 'Политика Cookie и аналитики',             href: '/legal/cookies' },
  { type: 'BROADCAST_CONSENT',    label: 'Согласие на информационные рассылки',     href: '/legal/broadcast-consent' },
];

/** Maps URL slug → LegalDocType */
export const SLUG_TO_TYPE: Record<string, LegalDocType> = {
  privacy:            'PRIVACY_POLICY',
  terms:              'USER_AGREEMENT',
  consent:            'PERSONAL_DATA_CONSENT',
  cookies:            'COOKIE_POLICY',
  'broadcast-consent':'BROADCAST_CONSENT',
};

/** Canonical content remains available when the backend is unavailable. */
export const FALLBACK_CONTENT: Record<LegalDocType, { title: string; content: string }> =
  LEGAL_DOCUMENTS;

/** Fetch legal doc from backend; returns null on any error (caller uses fallback) */
export async function fetchLegalDoc(type: LegalDocType): Promise<LegalDocItem | null> {
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://backend:3001';
    const res = await fetch(`${backendUrl}/api/legal/${type}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<LegalDocItem>;
  } catch {
    return null;
  }
}
