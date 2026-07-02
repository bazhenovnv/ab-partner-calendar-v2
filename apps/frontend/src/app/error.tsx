'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/PublicShell';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error tracking in future
    console.error(error);
  }, [error]);

  return (
    <PublicShell>
      <div className="max-w-[900px] mx-auto px-4 tablet:px-8 py-24 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 mb-6">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="13" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.3" />
            <path d="M16 10v7M16 21v1.5" stroke="#0D2344" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
          </svg>
        </div>
        <h1 className="font-montserrat font-bold text-primary text-2xl mb-3">
          Что-то пошло не так
        </h1>
        <p className="text-primary/60 text-sm mb-8 max-w-sm mx-auto">
          Произошла ошибка при загрузке страницы. Попробуйте обновить или вернитесь на главную.
        </p>
        <div className="flex flex-col mobile:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="w-full mobile:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="w-full mobile:w-auto inline-flex items-center justify-center gap-2 border border-primary/20 text-primary font-medium px-6 py-3 rounded-xl text-sm hover:bg-primary/5 active:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            На главную
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
