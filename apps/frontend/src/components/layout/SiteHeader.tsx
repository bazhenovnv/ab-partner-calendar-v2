import Link from 'next/link';

const TG_CHANNEL  = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
const PARTNER_URL = 'https://ab-buhpartner.ru/';

export function SiteHeader() {
  return (
    <header className="bg-white sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 h-20 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 group shrink-0"
          aria-label="АБ Афиша Бухгалтера — на главную"
        >
          {/*
            Monogram "аб" — traced from project-assets/03_logo_frames/Frame 60.png
            viewBox 0 0 96 78, strokeWidth 9

            "а": left leg (4,73)→(4,26) + semicircular arch (4,26)→(42,26) going up
                 + shorter right leg (42,26)→(42,50) + counter circle cx=23 cy=40 r=12

            "б": two parallel diagonal strokes at ~66° + belly circle bottom-right
          */}
          <svg
            width="50"
            height="40"
            viewBox="0 0 96 78"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary shrink-0"
            aria-hidden="true"
          >
            {/* "а" — arch + two legs + inner circle counter */}
            <path
              d="M 4 73 L 4 26 A 19 19 0 0 1 42 26 L 42 50"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="23"
              cy="40"
              r="12"
              stroke="currentColor"
              strokeWidth="9"
              fill="none"
            />

            {/* "б" — two parallel diagonal strokes + belly circle */}
            <line x1="53" y1="52" x2="73" y2="4"  stroke="currentColor" strokeWidth="9" strokeLinecap="butt" />
            <line x1="64" y1="52" x2="84" y2="4"  stroke="currentColor" strokeWidth="9" strokeLinecap="butt" />
            <circle
              cx="74"
              cy="62"
              r="11"
              stroke="currentColor"
              strokeWidth="9"
              fill="none"
            />
          </svg>

          {/* Gilroy Semibold — project primary font, loaded via @font-face in globals.css */}
          <span className="font-gilroy font-semibold text-primary text-xl leading-tight">
            Афиша Бухгалтера
          </span>
        </Link>

        <nav aria-label="Внешние ссылки" className="flex items-center gap-2">
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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
