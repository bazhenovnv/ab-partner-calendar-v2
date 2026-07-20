'use client';

import { useMemo } from 'react';
import { sanitizeEventHtml } from '@/lib/html';

interface SanitizedHtmlProps {
  html?: string | null;
  className?: string;
}

/**
 * Выводит HTML только после клиентской XSS-санитизации.
 *
 * Компонент изолирует DOMPurify от серверных компонентов Next.js.
 */
export function SanitizedHtml({
  html,
  className,
}: SanitizedHtmlProps) {
  const sanitizedHtml = useMemo(
    () => sanitizeEventHtml(html),
    [html],
  );

  if (!sanitizedHtml) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
