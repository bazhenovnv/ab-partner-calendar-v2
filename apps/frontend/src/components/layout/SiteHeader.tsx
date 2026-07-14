import Link from 'next/link';
import Image from 'next/image';
import logoImg from '../../../public/ab-logo-mark-cropped.png';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

const MAX_ICON = 'data:image/png;base64,"+b64_max+"';
const PARTNER_ICON = 'data:image/png;base64,"+b64_partner+"';
const TG_ICON = 'data:image/png;base64,"+b64_tg+"';

const NAV_BTN =
  'flex items-center gap-2 ' +
  'border border-black/[0.12] ' +
  'rounded-lg ' +
  'px-4 h-[38px] ' +
  'text-sm font-medium text-primary bg-white ' +
  'shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] ' +
  'hover:bg-gray-50 transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint';

function HeaderIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={26}
      height={26}
      unoptimized
      className="pub-header-action-icon"
    />
  );
}

export function SiteHeader() {
  return (
    <header className="bg-transparent">
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
            style={{ height: '67px' }}
            aria-hidden
            priority
          />
          <span className="[font-family:var(--font-montserrat)] font-semibold text-[#1e1e1e] text-[18.69px] leading-normal">
            Афиша Бухгалтера
          </span>
        </Link>

        <nav aria-label="Внешние ссылки" className="flex items-center gap-2">
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className={NAV_BTN}
          >
            <HeaderIcon src={TG_ICON} alt="" />
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className={NAV_BTN}
          >
            <HeaderIcon src={MAX_ICON} alt="" />
            <span className="hidden tablet:inline">MAX</span>
          </a>

          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className={NAV_BTN}
          >
            <HeaderIcon src={PARTNER_ICON} alt="" />
            <span className="hidden tablet:inline">Стать партнёром</span>
            <span className="tablet:hidden">Партнёр</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
