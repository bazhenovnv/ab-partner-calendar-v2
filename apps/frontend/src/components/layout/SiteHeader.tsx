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

function HeaderActionIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="pub-header-action-icon-wrap" aria-hidden="true">
      <Image
        src={src}
        alt={alt}
        width={28}
        height={28}
        className="pub-header-action-icon"
        unoptimized
      />
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
            <HeaderActionIcon src="/ui-icons/icon-telegram-approved.png" alt="" />
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className={NAV_BTN}
          >
            <HeaderActionIcon src="/ui-icons/icon-max-approved.png" alt="" />
            <span className="hidden tablet:inline">MAX</span>
          </a>

          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className={NAV_BTN}
          >
            <HeaderActionIcon src="/ui-icons/icon-partner-approved.png" alt="" />
            <span className="hidden tablet:inline">Стать партнёром</span>
            <span className="tablet:hidden">Партнёр</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
