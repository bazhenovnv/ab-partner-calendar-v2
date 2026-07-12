import Link from 'next/link';
import Image from 'next/image';
import logoImg from '../../../public/ab-logo-mark-cropped.png';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

const NAV_BTN =
  'flex items-center gap-2 ' +
  'border border-black/[0.12] ' +
  'rounded-lg ' +
  'px-4 h-[38px] ' +        // h=38px confirmed {C0944B54} {CA965F25}
  'text-sm font-medium text-primary bg-white ' +
  'shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] ' + // project shadow standard
  'hover:bg-gray-50 transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint';

export function SiteHeader() {
  return (
    <header className="bg-white">
      {/* max-w-[1496px]: confirmed {F6242A4C} footer 1496×72, {DDFD1908} modal 1496×768 */}
      <div className="max-w-[1496px] mx-auto px-4 tablet:px-8 h-20 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 group shrink-0"
          aria-label="АБ Афиша Бухгалтера — на главную"
        >
          <Image
            src={logoImg}
            alt=""
            width={62}
            height={67}
            className="shrink-0 object-contain"
            aria-hidden
            priority
          />

          {/* Figma 5893:346: Montserrat SemiBold 18.69px #1e1e1e */}
          <span className="[font-family:var(--font-montserrat)] font-semibold text-[#1e1e1e] text-[18.69px] leading-normal">
            Афиша Бухгалтера
          </span>
        </Link>

        {/* gap-2 = 8px confirmed {C0944B54} {CA965F25} */}
        <nav aria-label="Внешние ссылки" className="flex items-center gap-2">

          {/* Telegram — 118×38px {C0944B54}; brand #2AABEE */}
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className={NAV_BTN}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="12" fill="#2AABEE" />
              <path
                d="M5.5 11.5 17 7l-1.93 9.1c-.14.63-.52.79-1.05.49l-2.94-2.17-1.42 1.37c-.16.15-.29.28-.59.28l.21-2.98 5.44-4.91c.23-.21-.05-.32-.37-.11L7.1 13.5 4.2 12.6c-.62-.19-.63-.62.13-.91z"
                fill="white"
              />
            </svg>
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          {/* MAX — width not confirmed in audit; auto width, h=38px consistent */}
          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className={NAV_BTN}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="12" fill="#006BFF" />
              <path
                d="M12 5.5C8.41 5.5 5.5 8.13 5.5 11.5c0 1.08.29 2.1.79 3L5.5 18.5l3.25-1.04A6.64 6.64 0 0 0 12 18c3.59 0 6.5-2.91 6.5-6.5S15.59 5.5 12 5.5z"
                fill="white"
              />
              <circle cx="12" cy="11.5" r="2.5" fill="#006BFF" />
            </svg>
            <span className="hidden tablet:inline">MAX</span>
          </a>

          {/* Стать партнёром — 181.67×38.34px confirmed {CA965F25} */}
          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className={NAV_BTN}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="hidden tablet:inline">Стать партнёром</span>
            <span className="tablet:hidden">Партнёр</span>
          </a>

        </nav>
      </div>
    </header>
  );
}
