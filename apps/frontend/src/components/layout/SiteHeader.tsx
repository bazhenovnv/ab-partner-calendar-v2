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
            Monogram "аб" — geometry traced from project-assets/03_logo_frames/Frame 60.png
            viewBox 0 0 130 100, strokeWidth 9

            "а": left leg (16,93)→(16,27) + semicircular arch A 21 21 to (58,27) going up
                 + shorter right leg (58,27)→(58,54) + counter circle cx=37 cy=70 r=12

            "б": diagonal stroke (63,84)→(98,10) + parallel stroke (74,84)→(109,10)
                 + belly circle cx=106 cy=76 r=14
          */}
          <svg
            width="52"
            height="40"
            viewBox="0 0 130 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary shrink-0"
            aria-hidden="true"
          >
            {/* "а" — left leg + semicircular arch + shorter right leg + counter circle */}
            <path
              d="M 16 93 L 16 27 A 21 21 0 0 1 58 27 L 58 54"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="37"
              cy="70"
              r="12"
              stroke="currentColor"
              strokeWidth="9"
              fill="none"
            />
            {/* "б" — two parallel diagonal strokes (lower-left to upper-right) + belly circle */}
            <line x1="63" y1="84" x2="98"  y2="10" stroke="currentColor" strokeWidth="9" strokeLinecap="butt" />
            <line x1="74" y1="84" x2="109" y2="10" stroke="currentColor" strokeWidth="9" strokeLinecap="butt" />
            <circle
              cx="106"
              cy="76"
              r="14"
              stroke="currentColor"
              strokeWidth="9"
              fill="none"
            />
          </svg>

          <span className="font-gilroy font-semibold text-primary text-xl leading-tight">
            Афиша Бухгалтера
          </span>
        </Link>

        <nav aria-label="Внешние ссылки" className="flex items-center gap-2">
          {/* Telegram — official brand icon: #2AABEE circle + white paper plane */}
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в Telegram"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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

          {/* MAX — official brand icon: #006BFF circle + white chat-bubble mark */}
          <a
            href={MAX_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Наш канал в MAX"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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

          {/* Стать партнёром */}
          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Стать партнёром АБ Афиша"
            className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-primary bg-white shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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
