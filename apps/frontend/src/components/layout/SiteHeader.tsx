import Image from 'next/image';
import Link from 'next/link';
import logoImg from '../../../public/ab-logo-mark-cropped.png';

const TG_CHANNEL = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

const NAV_BTN =
  'pub-header-action flex items-center border border-black/[0.12] bg-white ' +
  'text-primary transition-colors hover:bg-gray-50 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-mint';

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
      <Image
        src="/ui-icons/header/max-header-icon.png"
        alt=""
        width={28}
        height={28}
        className="pub-header-action-icon pub-header-action-icon--max"
      />
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
    <header className="pub-header bg-transparent">
      <div className="pub-header-inner mx-auto flex max-w-[1496px] items-center justify-between">
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

        <nav aria-label="Внешние ссылки" className="pub-header-actions flex items-center">
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
