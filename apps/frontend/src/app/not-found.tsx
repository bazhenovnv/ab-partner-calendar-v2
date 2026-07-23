import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/PublicShell';

export const metadata: Metadata = {
  title: '404 — Страница не найдена',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <PublicShell>
      <div className="max-w-[900px] mx-auto px-4 tablet:px-8 py-24 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/5 mb-6">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="16" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.2" />
            <path d="M13 20h14M20 13l7 7-7 7" stroke="#0D2344" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3" />
          </svg>
        </div>

        <p className="text-primary/30 text-sm font-medium tracking-widest uppercase mb-3">
          404
        </p>

        <h1 className="font-montserrat font-bold text-primary text-2xl tablet:text-3xl mb-3">
          Страница не найдена
        </h1>

        <p className="text-primary/60 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          Возможно, ссылка устарела или страница была удалена.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          На главную
        </Link>
      </div>
    </PublicShell>
  );
}
