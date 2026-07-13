import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/PublicShell';
import { HeroSection } from '@/components/HeroSection';
import { EventsSection } from '@/components/events/EventsSection';
import { MainEventsBanner } from '@/components/events/MainEventsBanner';
import { RotatingQuotesBlock } from '@/components/RotatingQuotesBlock';
import { fetchMainEvents, fetchPublicEvents, fetchDirections, fetchPublicQuotes } from '@/lib/api';

export const dynamic = 'force-dynamic';

const USE_FIXTURES =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_FIXTURES === '1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ab-event.pro';

export const metadata: Metadata = {
  title: 'АБ Афиша Бухгалтера — Главные мероприятия для бухгалтеров',
  description:
    'Онлайн и офлайн события для профессионального роста, обмена опытом и актуальной практики бухгалтеров по всей России.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'АБ Афиша Бухгалтера',
    description:
      'Онлайн и офлайн события для профессионального роста, обмена опытом и актуальной практики бухгалтеров по всей России.',
    url: SITE_URL,
    type: 'website',
    locale: 'ru_RU',
    siteName: 'АБ Афиша Бухгалтера',
  },
};

export default async function HomePage() {
  let main: Awaited<ReturnType<typeof fetchMainEvents>> = [];
  let events: Awaited<ReturnType<typeof fetchPublicEvents>> = { events: [], total: 0, isFallback: false };
  let dirs: Awaited<ReturnType<typeof fetchDirections>> = [];
  let qs: Awaited<ReturnType<typeof fetchPublicQuotes>> = [];

  if (USE_FIXTURES) {
    const { DEV_MAIN_EVENTS, DEV_EVENTS_RESPONSE, DEV_QUOTES } = await import('@/lib/dev-fixtures');
    main   = DEV_MAIN_EVENTS;
    events = DEV_EVENTS_RESPONSE;
    qs     = DEV_QUOTES;
  } else {
    const [mainEvents, initialEvents, directions, quotes] = await Promise.allSettled([
      fetchMainEvents(),
      fetchPublicEvents({ page: 1, limit: 6 }),
      fetchDirections(),
      fetchPublicQuotes(),
    ]);
    main   = mainEvents.status === 'fulfilled' ? mainEvents.value : [];
    events = initialEvents.status === 'fulfilled'
      ? initialEvents.value
      : { events: [], total: 0, isFallback: false };
    dirs   = directions.status === 'fulfilled' ? directions.value : [];
    qs     = quotes.status === 'fulfilled' ? quotes.value : [];
  }

  return (
    <PublicShell>
      <HeroSection />
      <EventsSection initialData={events} directions={dirs} />
      {(main.length > 0 || qs.length > 0) && (
        <div className="pub-main-quotes-wrapper">
          <div className="pub-main-quotes-inner">
            {main.length > 0 && <MainEventsBanner events={main} />}
            {qs.length > 0 && <RotatingQuotesBlock quotes={qs} />}
          </div>
        </div>
      )}
    </PublicShell>
  );
}
