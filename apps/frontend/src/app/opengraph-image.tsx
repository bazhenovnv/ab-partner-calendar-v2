import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'АБ Афиша Бухгалтера — Главные мероприятия для бухгалтеров';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0D2344',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle diagonal accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 320,
            height: 630,
            background: 'rgba(124,216,179,0.04)',
            transform: 'skewX(-12deg)',
            transformOrigin: 'top right',
          }}
        />

        {/* Logo block */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(124,216,179,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              color: '#7CD8B3',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-1px',
            }}
          >
            АБ
          </span>
        </div>

        {/* Site name */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '-1px',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          АБ Афиша Бухгалтера
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 24,
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: 680,
            lineHeight: 1.4,
          }}
        >
          Главные мероприятия для бухгалтеров по всей России
        </div>

        {/* Mint accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#7CD8B3',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
