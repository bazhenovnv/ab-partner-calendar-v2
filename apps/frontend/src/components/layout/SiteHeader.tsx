import Image from 'next/image';
import Link from 'next/link';
import logoImg from '../../../public/ab-logo-mark-cropped.png';

const TG_CHANNEL = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

const NAV_BTN =
  'flex h-[38px] items-center gap-2 rounded-lg border border-black/[0.12] bg-white px-4 ' +
  'text-sm font-medium text-primary shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] ' +
  'transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint';

function TelegramIcon() {
  return (
    <span className="pub-header-action-icon-wrap" aria-hidden="true">
      <svg className="pub-header-action-icon" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#2AABEE" />
        <path
          d="M23.8 9.5 21.4 22c-.18.88-.66 1.1-1.34.68l-3.66-2.7-1.77 1.7c-.2.2-.36.36-.74.36l.26-3.73 6.8-6.14c.3-.26-.06-.41-.46-.15l-8.4 5.3-3.62-1.14c-.79-.25-.8-.79.16-1.17l14.16-5.46c.66-.24 1.24.16 1.02.95Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

function MaxIcon() {
  return (
    <span className="pub-header-action-icon-wrap" aria-hidden="true">
      <svg className="pub-header-action-icon" viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="max-gradient" x1="6" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B35F2" />
            <stop offset="1" stopColor="#8B2BE2" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="url(#max-gradient)" />
        <path
          d="M10.3 10.5h3.2l2.5 4.1 2.5-4.1h3.2v11h-3v-6.3l-2.7 4.1-2.7-4.1v6.3h-3v-11Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

function PartnerIcon() {
  return (
    <span className="pub-header-action-icon-wrap" aria-hidden="true">
      <svg className="pub-header-action-icon" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#2AABEE" />
        <circle cx="14" cy="12" r="3" stroke="white" strokeWidth="1.8" />
        <path d="M8.8 22c.5-3.4 2.5-5.1 5.2-5.1s4.7 1.7 5.2 5.1" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M23 11v6M20 14h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-transparent">
      <div className="mx-auto flex h-[88px] max-w-[1496px] items-center justify-between gap-4 px-4 tablet:px-8">
        <Link href="/" className="pub-header-brand group" aria-label="АБ Афиша Бухгалтера — на главную">
          <Image
            src={logoImg}
            alt=""
            width={68}
            height={72}
            className="pub-header-brand-mark"
            aria-hidden="true"
            priority
          />
          <span className="pub-header-brand-title">Афиша Бухгалтера</span>
        </Link>

        <nav aria-label="Внешние ссылки" className="flex items-center gap-2">
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className={NAV_BTN}
          >
            <TelegramIcon />
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className={NAV_BTN}
          >
            <MaxIcon />
            <span className="hidden tablet:inline">MAX</span>
          </a>

          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className={NAV_BTN}
          >
            <PartnerIcon />
            <span className="hidden tablet:inline">Стать партнёром</span>
            <span className="tablet:hidden">Партнёр</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
