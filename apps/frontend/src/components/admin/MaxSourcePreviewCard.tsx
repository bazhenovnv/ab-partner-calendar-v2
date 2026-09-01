'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, ApiError } from '@/lib/admin-api';

type SourcePreviewAttachment = {
  type: string;
  url: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
};

type SourcePreview = {
  available: boolean;
  reason?: string;
  externalId?: string;
  httpStatus?: number;
  directPostUrl?: string | null;
  channel?: {
    id: number;
    title: string | null;
    type: string;
    isPublic: boolean;
    url: string | null;
  };
  message?: {
    text: string;
    timestamp: string | null;
    attachments: SourcePreviewAttachment[];
  };
};

type SourceAwareEvent = {
  id?: unknown;
  source?: unknown;
  externalId?: unknown;
  images?: Array<{
    originalUrl?: string | null;
    thumbnailUrl?: string | null;
    eventCardUrl?: string | null;
  }>;
};

interface MaxSourcePreviewCardProps {
  event: object;
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith('/')) return candidate;
  return safeHttpUrl(candidate);
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(date);
}

export default function MaxSourcePreviewCard({ event }: MaxSourcePreviewCardProps) {
  const sourceEvent = event as SourceAwareEvent;
  const eventId = typeof sourceEvent.id === 'string' ? sourceEvent.id : '';
  const isMax = sourceEvent.source === 'MAX';
  const [preview, setPreview] = useState<SourcePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isMax || !eventId) {
      setPreview(null);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    void adminApi
      .get<SourcePreview>(`/events/admin/${eventId}/source-preview`)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось загрузить исходный пост MAX',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, isMax]);

  const imageUrls = useMemo(() => {
    const sourceImages =
      preview?.message?.attachments
        ?.filter((attachment) => attachment.type === 'image')
        .map((attachment) => safeImageUrl(attachment.url))
        .filter((value): value is string => Boolean(value)) ?? [];

    if (sourceImages.length > 0) return sourceImages;

    const fallback = sourceEvent.images
      ?.flatMap((image) => [image.originalUrl, image.thumbnailUrl, image.eventCardUrl])
      .map(safeImageUrl)
      .find((value): value is string => Boolean(value));

    return fallback ? [fallback] : [];
  }, [preview, sourceEvent.images]);

  if (!isMax) return null;

  const timestamp = formatTimestamp(preview?.message?.timestamp);
  const directPostUrl = safeHttpUrl(preview?.directPostUrl);
  const channelUrl = safeHttpUrl(preview?.channel?.url);
  const externalId = preview?.externalId ??
    (typeof sourceEvent.externalId === 'string' ? sourceEvent.externalId : null);

  return (
    <div className="adm-card" style={{ marginBottom: '1rem', border: '1px solid #c9d9ea' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.05rem' }}>
        Исходный пост MAX
      </h2>

      {loading && <p className="adm-muted">Загрузка исходного поста MAX…</p>}

      {error && (
        <p className="adm-error" style={{ marginBottom: 0 }}>
          {error}. Данные события можно редактировать как обычно.
        </p>
      )}

      {!loading && !error && preview && !preview.available && (
        <p className="adm-muted" style={{ marginBottom: 0 }}>
          Исходный пост сейчас недоступен через MAX API
          {preview.httpStatus ? ` (HTTP ${preview.httpStatus})` : ''}.
        </p>
      )}

      {!loading && !error && preview?.available && preview.message && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {!directPostUrl && preview.channel?.isPublic === false && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.04)',
              }}
            >
              Канал MAX приватный. MAX API не предоставляет прямую ссылку на
              отдельный пост, поэтому исходный пост показан прямо здесь — искать
              его вручную в ленте не требуется.
            </div>
          )}

          <div className="adm-muted" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {preview.channel?.title && <span>Канал: {preview.channel.title}</span>}
            {timestamp && <span>Опубликовано: {timestamp}</span>}
            {externalId && <span style={{ fontFamily: 'monospace' }}>ID: {externalId}</span>}
          </div>

          <div
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              padding: '0.9rem',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              maxHeight: '360px',
              overflow: 'auto',
            }}
          >
            {preview.message.text || 'В исходном сообщении нет текста.'}
          </div>

          {imageUrls.length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {imageUrls.map((url, index) => (
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt={`Изображение исходного поста MAX ${index + 1}`}
                  style={{
                    display: 'block',
                    maxWidth: '320px',
                    maxHeight: '320px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
              ))}
            </div>
          )}

          {(directPostUrl || channelUrl) && (
            <div>
              <a
                href={directPostUrl ?? channelUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="adm-btn adm-btn--secondary"
              >
                {directPostUrl ? 'Перейти к посту MAX' : 'Открыть канал MAX'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
