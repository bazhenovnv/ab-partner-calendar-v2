'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            background: '#f9fafb',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(13,35,68,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="13" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.3" />
              <path d="M16 10v7M16 21v1.5" stroke="#0D2344" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0D2344', margin: '0 0 0.75rem' }}>
            500 — Внутренняя ошибка сервера
          </h1>
          <p style={{ color: 'rgba(13,35,68,0.6)', fontSize: '0.875rem', marginBottom: '2rem', maxWidth: 360 }}>
            Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: '#0D2344',
                color: '#fff',
                fontWeight: 600,
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
            <a
              href="/"
              style={{
                background: 'transparent',
                color: '#0D2344',
                fontWeight: 500,
                padding: '0.75rem 1.5rem',
                borderRadius: 12,
                fontSize: '0.875rem',
                border: '1px solid rgba(13,35,68,0.2)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              На главную
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
