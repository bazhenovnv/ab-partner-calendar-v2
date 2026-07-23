'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '../../../public/ab-logo-mark-cropped.png';
import { LEGAL_LINKS } from '@/lib/legal';
import stationeryImg from '../../../public/notebook-stationery.png';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info-event@a-b.ru';

const PROJECT_LINKS = [
  { label: 'АБ Партнёр', href: PARTNER_URL },
  { label: 'АБ Онлайн-касса', href: 'https://a-b.ru/' },
  { label: 'АБ Ресторан', href: 'https://a-b.ru/' },
  { label: 'АБ Сервис', href: 'https://a-b.ru/' },
  { label: 'АБ Креатив', href: 'https://a-b.ru/' },
];

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
    <footer className="pub-footer" style={{ background: 'transparent' }} aria-label="Подвал сайта">
      <div className="pub-footer-inner">
        <div className="pub-footer-top">
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
            <p className="pub-footer-desc">Мероприятия для бухгалтеров по всей России.</p>
          </div>

          <div className="pub-footer-col">
            <p className="pub-footer-col-title">Наши проекты</p>
            <ul className="pub-footer-links">
              {PROJECT_LINKS.map((project) => (
                <li key={project.label}>
                  <a href={project.href} target="_blank" rel="noopener noreferrer" className="pub-footer-link">
                    {project.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="pub-footer-col">
            <p className="pub-footer-col-title">Контакты</p>
            <ul className="pub-footer-links">
              <li><a href="tel:+79298386482" className="pub-footer-link pub-footer-link--strong">+7 (929) 838 64 82</a></li>
              <li><span className="pub-footer-link" style={{ cursor: 'default' }}>Пн–Пт, 9:00–18:00 (МСК)</span></li>
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
              <li><span className="pub-footer-link" style={{ cursor: 'default' }}>Россия, г. Краснодар</span></li>
            </ul>
          </div>

          <div className="pub-footer-stationery" aria-hidden="true">
            <Image
              src={stationeryImg}
              alt=""
              width={365}
              height={349}
              className="pub-footer-stationery-img"
              aria-hidden
            />
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
          <p className="pub-footer-copy">© {new Date().getFullYear()} АБ Афиша Бухгалтера</p>
        </div>

        <p className="pub-footer-disclaimer">
          © 2022–{new Date().getFullYear()}. Официальный сайт интернет-площадки «АБ Афиша Бухгалтера» в России.
          Текущий сайт является объектом авторского права, исключительные права на использование которого принадлежат
          компании ООО «Автоматизация Бизнеса». Копирование, размножение, распространение, перепечатка (целиком или
          частично), а также любое использование материалов без письменного разрешения компании не допускается.
          Любое нарушение прав автора будет преследоваться на основе российского и международного законодательства.
        </p>
        <p className="pub-footer-operator">
          ООО «АБ ГРУПП» · ОГРН&nbsp;1212300074766 · ИНН&nbsp;2308283450 ·
          350049, Краснодарский край, г.&nbsp;Краснодар, ул.&nbsp;Красных Партизан, д.&nbsp;164, помещение&nbsp;5
        </p>
      </div>
    </footer>
  );
}
