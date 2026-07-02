import Link from 'next/link';
import { PublicShell } from '@/components/layout/PublicShell';

export default function EventNotFound() {
  return (
    <PublicShell>
      <div className="max-w-[900px] mx-auto px-4 tablet:px-8 py-24 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/5 mb-6">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="30" height="25" rx="3" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.25" />
            <path d="M12 5v10M28 5v10M5 20h30" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
            <path d="M14 28l12-6M26 28l-12-6" stroke="#0D2344" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" />
          </svg>
        </div>

        <p className="text-primary/30 text-sm font-medium tracking-widest uppercase mb-3">404</p>

        <h1 className="font-montserrat font-bold text-primary text-2xl tablet:text-3xl mb-3">
          Мероприятие не найдено
        </h1>
        <p className="text-primary/60 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          Возможно, оно было удалено, ещё не опубликовано или ссылка устарела.
        </p>

        <div className="flex flex-col mobile:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="w-full mobile:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Все мероприятия
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
