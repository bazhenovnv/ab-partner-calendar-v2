import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/PublicShell';
import { HeroSection } from '@/components/HeroSection';
import { EventsSection } from '@/components/events/EventsSection';
import { MainEventsBanner } from '@/components/events/MainEventsBanner';
import { EventModalProvider } from '@/components/events/EventModalProvider';
import { RotatingQuotesBlock } from '@/components/RotatingQuotesBlock';
import {
  fetchMainEvents,
  fetchLatestCompletedEvents,
  fetchPublicEvents,
  fetchDirections,
  fetchPublicQuotes,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

const USE_FIXTURES =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_FIXTURES === '1';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ab-event.pro';

export const metadata: Metadata = {
  title: 'АБ Афиша Бухгалтера — Главные мероприятия для бухгалтеров',
  description:
    'Онлайн и офлайн события для профессионального роста, обмена опытом и актуальной практики бухгалтеров по всей России.',
  alternates: { canonical: SITE_URL },
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
  let completed: Awaited<ReturnType<typeof fetchLatestCompletedEvents>> = [];
  let events: Awaited<ReturnType<typeof fetchPublicEvents>> = {
    events: [],
    total: 0,
    isFallback: false,
  };
  let dirs: Awaited<ReturnType<typeof fetchDirections>> = [];
  let qs: Awaited<ReturnType<typeof fetchPublicQuotes>> = [];

  if (USE_FIXTURES) {
    const { DEV_MAIN_EVENTS, DEV_EVENTS_RESPONSE, DEV_QUOTES } =
      await import('@/lib/dev-fixtures');

    main = DEV_MAIN_EVENTS;
    events = DEV_EVENTS_RESPONSE;
    qs = DEV_QUOTES;
  } else {
    const [mainEvents, completedEvents, initialEvents, directions, quotes] =
      await Promise.allSettled([
        fetchMainEvents(),
        fetchLatestCompletedEvents(5),
        fetchPublicEvents({ page: 1, limit: 6 }),
        fetchDirections(),
        fetchPublicQuotes(),
      ]);

    main = mainEvents.status === 'fulfilled' ? mainEvents.value : [];
    completed =
      completedEvents.status === 'fulfilled' ? completedEvents.value : [];
    events =
      initialEvents.status === 'fulfilled'
        ? initialEvents.value
        : { events: [], total: 0, isFallback: false };
    dirs = directions.status === 'fulfilled' ? directions.value : [];
    qs = quotes.status === 'fulfilled' ? quotes.value : [];
  }

  const carouselEvents = main.length > 0 ? main : completed;

  return (
    <PublicShell>
      <EventModalProvider>
        <HeroSection />
        <EventsSection initialData={events} directions={dirs} />

        <div className="pub-main-quotes-wrapper">
          <div className="pub-main-quotes-inner">
            <MainEventsBanner events={carouselEvents} />
            {qs.length > 0 && <RotatingQuotesBlock quotes={qs} />}
          </div>
        </div>
      </EventModalProvider>
    </PublicShell>
  );
}
