import Link from 'next/link';
import { LEGAL_LINKS } from '@/lib/legal';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0D2344' }}>
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: '#7CD8B3',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>АБ Афиша Бухгалтера</h1>
          <p style={{ color: '#fff', opacity: 0.7 }}>Разработка ведётся</p>
          <p style={{ color: '#fff', opacity: 0.5, marginTop: '1rem', fontSize: '0.875rem' }}>
            ab-event.pro
          </p>
        </div>
      </main>

      <footer
        style={{
          background: '#071729',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem 1.25rem',
          justifyContent: 'center',
        }}
        aria-label="Юридические документы"
      >
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.type}
            href={link.href}
            style={{ color: '#7CD8B3', fontSize: '0.75rem', textDecoration: 'none' }}
          >
            {link.label}
          </Link>
        ))}
      </footer>
    </div>
  );
}
