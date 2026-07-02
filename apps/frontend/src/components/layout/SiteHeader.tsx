import Link from 'next/link';

const TG_CHANNEL = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

export function SiteHeader() {
  return (
    <header className="bg-primary sticky top-0 z-40 shadow-base">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 group shrink-0"
          aria-label="АБ Афиша Бухгалтера — на главную"
        >
          <span className="text-mint font-montserrat font-bold text-lg tablet:text-xl leading-tight group-hover:opacity-80 transition-opacity">
            АБ Афиша
          </span>
          <span className="hidden tablet:block text-white/60 text-sm font-normal">
            Главные события для бухгалтеров
          </span>
        </Link>

        <nav
          aria-label="Внешние ссылки"
          className="flex items-center gap-1 tablet:gap-2"
        >
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className="flex items-center gap-1.5 text-white/70 hover:text-mint transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
            </svg>
            <span className="hidden tablet:inline">Telegram</span>
          </a>

          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className="flex items-center gap-1.5 text-white/70 hover:text-mint transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            className="flex items-center gap-1.5 bg-mint/15 text-mint hover:bg-mint/25 active:bg-mint/35 transition-colors text-sm font-medium px-2.5 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint ml-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1C3.686 1 1 3.686 1 7s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6ZM7 4v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden mobile:inline">Стать партнёром</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
