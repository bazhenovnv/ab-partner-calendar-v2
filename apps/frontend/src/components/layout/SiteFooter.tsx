'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { LEGAL_LINKS } from '@/lib/legal';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info-event@a-b.ru';

export function SiteFooter() {
  const [toast, setToast] = useState<'copied' | 'fallback' | null>(null);

  const handleEmailClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      try {
        await navigator.clipboard.writeText(CONTACT_EMAIL);
        setToast('copied');
      } catch {
        setToast('fallback');
      }
      setTimeout(() => setToast(null), 2500);
      void e;
    },
    [],
  );

  return (
    <footer className="pub-footer" aria-label="Подвал сайта">
      <div className="pub-footer-inner">
        <div className="pub-footer-top">
          {/* Brand */}
          <div className="pub-footer-brand">
            <div className="pub-footer-logo">
              <div className="pub-footer-logo-mark">АБ</div>
              <span className="pub-footer-logo-text">
                Афиша <span className="pub-footer-logo-accent">Бухгалтера</span>
              </span>
            </div>
            <p className="pub-footer-desc">
              Онлайн и офлайн события для профессионального роста, обмена опытом
              и актуальной практики бухгалтеров по всей России.
            </p>
          </div>

          {/* Projects */}
          <div className="pub-footer-col">
            <p className="pub-footer-col-title">Наши проекты</p>
            <ul className="pub-footer-links">
              <li>
                <a href={PARTNER_URL} target="_blank" rel="noopener noreferrer" className="pub-footer-link">
                  АБ Партнёр
                </a>
              </li>
              <li>
                <a href={TG_CHANNEL} target="_blank" rel="noopener noreferrer" className="pub-footer-link">
                  Telegram-канал
                </a>
              </li>
              <li>
                <a href={MAX_CHANNEL} target="_blank" rel="noopener noreferrer" className="pub-footer-link">
                  MAX-канал
                </a>
              </li>
            </ul>
          </div>

          {/* Contacts */}
          <div className="pub-footer-col">
            <p className="pub-footer-col-title">Контакты</p>
            <ul className="pub-footer-links">
              <li className="relative">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  onClick={handleEmailClick}
                  aria-label={`Написать на ${CONTACT_EMAIL} (нажмите, чтобы скопировать)`}
                  className="pub-footer-link"
                >
                  {CONTACT_EMAIL}
                </a>
                {toast && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="absolute bottom-full left-0 mb-2 bg-selected-day text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-base whitespace-nowrap animate-fade-in"
                  >
                    {toast === 'copied' ? 'Email скопирован' : 'Почтовый клиент открыт'}
                  </div>
                )}
              </li>
              <li>
                <a href={TG_CHANNEL} target="_blank" rel="noopener noreferrer" className="pub-footer-link">
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pub-footer-divider" />

        <div className="pub-footer-bottom">
          <nav aria-label="Юридические документы" className="pub-footer-legal">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.type} href={link.href} className="pub-footer-legal-link">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="pub-footer-copy">
            © {new Date().getFullYear()} АБ Афиша Бухгалтера
          </p>
        </div>
        <p className="pub-footer-operator">
          ООО «АБ ГРУПП» · ОГРН&nbsp;1212300074766 · ИНН&nbsp;2308283450
        </p>
      </div>
    </footer>
  );
}
