import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/PublicShell';
import { MainEventsBanner } from '@/components/events/MainEventsBanner';
import { EventsSection } from '@/components/events/EventsSection';
import { fetchMainEvents, fetchPublicEvents, fetchDirections } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'АБ Афиша Бухгалтера — Главные мероприятия для бухгалтеров',
  description:
    'Онлайн и офлайн события для профессионального роста, обмена опытом и актуальной практики бухгалтеров по всей России.',
};

export default async function HomePage() {
  const [mainEvents, initialEvents, directions] = await Promise.allSettled([
    fetchMainEvents(),
    fetchPublicEvents({ page: 1, limit: 6 }),
    fetchDirections(),
  ]);

  const main = mainEvents.status === 'fulfilled' ? mainEvents.value : [];
  const events =
    initialEvents.status === 'fulfilled'
      ? initialEvents.value
      : { events: [], total: 0, isFallback: false };
  const dirs = directions.status === 'fulfilled' ? directions.value : [];

  return (
    <PublicShell>
      {main.length > 0 && <MainEventsBanner events={main} />}
      <EventsSection initialData={events} directions={dirs} />
    </PublicShell>
  );
}
