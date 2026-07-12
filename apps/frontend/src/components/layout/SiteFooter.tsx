'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '../../../public/ab-logo-mark-cropped.png';
import { LEGAL_LINKS } from '@/lib/legal';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info-event@a-b.ru';

function NotebookIllustration() {
  return (
    <svg
      className="pub-footer-illustration"
      viewBox="0 0 220 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Notebook back cover */}
      <rect x="30" y="30" width="155" height="155" rx="8" fill="#E8F7F2" stroke="#7CD8B3" strokeWidth="1.5"/>
      {/* Spiral binding holes */}
      {[46, 64, 82, 100, 118, 136, 154, 172].map((y, i) => (
        <circle key={i} cx="30" cy={y} r="5" fill="white" stroke="#7CD8B3" strokeWidth="1.2"/>
      ))}
      {/* Notebook pages */}
      <rect x="40" y="38" width="140" height="140" rx="4" fill="white"/>
      <rect x="40" y="38" width="140" height="140" rx="4" stroke="#0D2344" strokeWidth="0.5" strokeOpacity="0.12"/>
      {/* Month header row */}
      <rect x="40" y="38" width="140" height="24" rx="4" fill="#0D2344"/>
      <rect x="40" y="50" width="140" height="12" fill="#0D2344"/>
      {/* Month label */}
      <text x="110" y="54" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" fontFamily="sans-serif">Июль 2026</text>
      {/* Day headers */}
      {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) => (
        <text key={d} x={52 + i * 19} y="76" textAnchor="middle" fontSize="6" fill="#0D2344" fillOpacity="0.45" fontFamily="sans-serif">{d}</text>
      ))}
      {/* Calendar grid - days */}
      {[
        [null,1,2,3,4,5,6],
        [7,8,9,10,11,12,13],
        [14,15,16,17,18,19,20],
        [21,22,23,24,25,26,27],
        [28,29,30,31,null,null,null],
      ].map((week, wi) =>
        week.map((d, di) => d ? (
          <g key={`${wi}-${di}`}>
            {d === 12 && <circle cx={52 + di * 19} cy={88 + wi * 17} r="8" fill="#7CD8B3" opacity="0.85"/>}
            <text
              x={52 + di * 19}
              y={91 + wi * 17}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight={d === 12 ? '700' : '400'}
              fill={d === 12 ? '#0D2344' : di >= 5 ? '#7CD8B3' : '#0D2344'}
              fillOpacity={d === 12 ? 1 : 0.75}
              fontFamily="sans-serif"
            >{d}</text>
            {/* Event marker dots */}
            {[3,7,14,19,22].includes(d) && (
              <circle cx={52 + di * 19} cy={94 + wi * 17} r="2" fill="#0D2344" opacity="0.3"/>
            )}
          </g>
        ) : null)
      )}
      {/* Pen */}
      <rect x="175" y="148" width="6" height="40" rx="2" transform="rotate(-20 175 148)" fill="#0D2344" opacity="0.6"/>
      <polygon points="172,182 178,182 175,192" fill="#7CD8B3" opacity="0.9"/>
      <rect x="173" y="145" width="6" height="6" rx="1" transform="rotate(-20 173 145)" fill="#7CD8B3" opacity="0.6"/>
      {/* Decorative circles */}
      <circle cx="18" cy="20" r="8" fill="#7CD8B3" opacity="0.15"/>
      <circle cx="205" cy="25" r="5" fill="#7CD8B3" opacity="0.2"/>
      <circle cx="200" cy="185" r="7" fill="#0D2344" opacity="0.06"/>
      {/* Star */}
      <path d="M195 50 L196.5 46 L198 50 L202 51.5 L198 53 L196.5 57 L195 53 L191 51.5 Z" fill="#7CD8B3" opacity="0.5"/>
    </svg>
  );
}

export function SiteFooter() {
  const [toast, setToast] = useState<'copied' | 'fallback' | null>(null);

  const handleEmailClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(CONTACT_EMAIL);
        setToast('copied');
      } catch {
        setToast('fallback');
      }
      setTimeout(() => setToast(null), 2500);
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
              <Image
                src={logoImg}
                alt=""
                width={46}
                height={50}
                className="shrink-0 object-contain"
                style={{ height: '50px' }}
                aria-hidden
              />
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

          {/* Notebook illustration */}
          <div className="pub-footer-illus" aria-hidden="true">
            <NotebookIllustration />
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
