import Link from 'next/link';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

export function SiteHeader() {
  return (
    <header className="bg-white border-b border-[#E8E3DC] sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="АБ Афиша Бухгалтера — на главную"
        >
          <svg
            width="38"
            height="32"
            viewBox="0 0 88 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary shrink-0"
            aria-hidden="true"
          >
            {/* "а" — open bowl with descending stem */}
            <path
              d="M35 22 A19 19 0 1 0 35 52 L35 64"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* "б" — two diagonal slashes + bottom circle */}
            <line x1="44" y1="46" x2="68" y2="6"  stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <line x1="57" y1="46" x2="81" y2="6"  stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <circle cx="64" cy="55" r="14" stroke="currentColor" strokeWidth="8" />
          </svg>
          <span className="font-montserrat font-bold text-primary text-base leading-tight">
            Афиша <span className="text-selected-day">Бухгалтера</span>
          </span>
        </Link>

        <nav aria-label="Внешние ссылки" className="flex items-center gap-1 tablet:gap-2">
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className="flex items-center gap-1.5 text-primary/60 hover:text-primary transition-colors text-sm px-2.5 py-1.5 rounded-lg hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
            </svg>
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className="flex items-center gap-1.5 text-primary/60 hover:text-primary transition-colors text-sm px-2.5 py-1.5 rounded-lg hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7.5 12h9M13.5 8.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden tablet:inline">MAX</span>
          </a>

          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary/90 active:bg-primary/80 transition-colors text-sm font-semibold px-3 py-1.5 rounded-lg ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <span className="hidden tablet:inline">Стать партнёром</span>
            <span className="tablet:hidden">Партнёр</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
