import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="bg-primary sticky top-0 z-40 shadow-base">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 group"
          aria-label="АБ Афиша Бухгалтера — на главную"
        >
          <span className="text-mint font-montserrat font-bold text-lg tablet:text-xl leading-tight group-hover:opacity-80 transition-opacity">
            АБ Афиша
          </span>
          <span className="hidden tablet:block text-white/60 text-sm font-normal">
            Главные события для бухгалтеров
          </span>
        </Link>
      </div>
    </header>
  );
}
