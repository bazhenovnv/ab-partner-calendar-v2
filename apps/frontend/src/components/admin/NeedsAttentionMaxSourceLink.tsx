'use client';

interface SourceAwareEvent {
  status?: unknown;
  source?: unknown;
  sourcePostUrl?: unknown;
}

interface NeedsAttentionMaxSourceLinkProps {
  event: object;
}

function safeHttpUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function NeedsAttentionMaxSourceLink({ event }: NeedsAttentionMaxSourceLinkProps) {
  const sourceEvent = event as SourceAwareEvent;
  if (sourceEvent.status !== 'NEEDS_ATTENTION' || sourceEvent.source !== 'MAX') return null;
  if (typeof sourceEvent.sourcePostUrl !== 'string') return null;

  const href = safeHttpUrl(sourceEvent.sourcePostUrl);
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
