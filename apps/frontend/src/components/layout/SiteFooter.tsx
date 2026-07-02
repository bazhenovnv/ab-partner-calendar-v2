'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { LEGAL_LINKS } from '@/lib/legal';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info-event@a-b.ru';

export function SiteFooter() {
  const [toast, setToast] = useState<'copied' | 'fallback' | null>(null);

  const handleEmailClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Always open mailto; additionally try to copy
      try {
        await navigator.clipboard.writeText(CONTACT_EMAIL);
        setToast('copied');
      } catch {
        // Clipboard blocked — mailto still opens via default href behavior
        setToast('fallback');
      }
      setTimeout(() => setToast(null), 2500);
      // Let the default href="mailto:..." proceed so mail client opens
      void e;
    },
    [],
  );

  return (
    <footer className="bg-[#071729] mt-auto" aria-label="Подвал сайта">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 py-6 tablet:py-8">
        <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-4">
          <nav
            aria-label="Юридические документы"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.type}
                href={link.href}
                className="text-mint/70 text-xs hover:text-mint transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mint rounded"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="relative shrink-0">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              onClick={handleEmailClick}
              aria-label={`Написать на ${CONTACT_EMAIL} (нажмите, чтобы скопировать)`}
              className="text-white/40 text-xs hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mint rounded"
            >
              {CONTACT_EMAIL}
            </a>

            {toast && (
              <div
                role="status"
                aria-live="polite"
                className="absolute bottom-full right-0 mb-2 bg-selected-day text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-base whitespace-nowrap animate-fade-in"
              >
                {toast === 'copied' ? 'Email скопирован' : 'Почтовый клиент открыт'}
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-white/25 text-xs">
          © {new Date().getFullYear()} АБ Афиша Бухгалтера
        </p>
      </div>
    </footer>
  );
}
