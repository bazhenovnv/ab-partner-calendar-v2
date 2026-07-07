import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/PublicShell';
import { HeroSection } from '@/components/HeroSection';
import { EventsSection } from '@/components/events/EventsSection';
import { MainEventsBanner } from '@/components/events/MainEventsBanner';
import { RotatingQuotesBlock } from '@/components/RotatingQuotesBlock';
import { fetchMainEvents, fetchPublicEvents, fetchDirections, fetchPublicQuotes } from '@/lib/api';

export const dynamic = 'force-dynamic';

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
  const [mainEvents, initialEvents, directions, quotes] = await Promise.allSettled([
    fetchMainEvents(),
    fetchPublicEvents({ page: 1, limit: 6 }),
    fetchDirections(),
    fetchPublicQuotes(),
  ]);

  const main   = mainEvents.status === 'fulfilled' ? mainEvents.value : [];
  const events = initialEvents.status === 'fulfilled'
    ? initialEvents.value
    : { events: [], total: 0, isFallback: false };
  const dirs   = directions.status === 'fulfilled' ? directions.value : [];
  const qs     = quotes.status === 'fulfilled' ? quotes.value : [];

  return (
    <PublicShell>
      <HeroSection />
      <EventsSection initialData={events} directions={dirs} />
      {main.length > 0 && <MainEventsBanner events={main} />}
      {qs.length > 0 && <RotatingQuotesBlock quotes={qs} />}
    </PublicShell>
  );
}
