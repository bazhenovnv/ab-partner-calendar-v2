'use client';

interface NeedsAttentionMaxSourceLinkProps {
  status: string;
  source?: string | null;
  sourcePostUrl?: string | null;
}

function safeHttpUrl(value?: string | null): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function NeedsAttentionMaxSourceLink({
  status,
  source,
  sourcePostUrl,
}: NeedsAttentionMaxSourceLinkProps) {
  if (status !== 'NEEDS_ATTENTION' || source !== 'MAX') return null;

  const href = safeHttpUrl(sourcePostUrl);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="adm-btn adm-btn--sm"
    >
      Перейти к событию
    </a>
  );
}
