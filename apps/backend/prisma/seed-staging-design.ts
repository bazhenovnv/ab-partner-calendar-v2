/**
 * Staging-only design seed — creates synthetic PUBLISHED events for visual QA.
 * Guard: only runs when APP_ENV=staging or STAGING_DESIGN_SEED=1.
 * Idempotent: all records use deterministic IDs prefixed with "staging-design-".
 *
 * Creates:
 *   6 regular PUBLISHED events (today + near-future dates, for calendar markers)
 *   5 of those also have mainEvent=true (for MainEventsBanner carousel)
 *   EventImage for each event (eventCardUrl + mainEventUrl for mainEvent records)
 *
 * Image paths resolve against FRONTEND_URL env var (fallback: NEXT_PUBLIC_SITE_URL → https://ab-event.pro).
 * The image files live in apps/frontend/public/events/ and are committed in the repo.
 *
 * Run: ts-node --project tsconfig.json prisma/seed-staging-design.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base URL of the Next.js frontend — used to build absolute image URLs.
const FRONTEND_URL = (
  process.env.FRONTEND_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://ab-event.pro'
).replace(/\/$/, '');

const GUARD =
  process.env.APP_ENV === 'staging' || process.env.STAGING_DESIGN_SEED === '1';

if (!GUARD) {
  console.log('[seed-staging-design] Skipped: APP_ENV != staging and STAGING_DESIGN_SEED != 1');
  process.exit(0);
}

// Today in Moscow tz offset (UTC+3), approximated as UTC+3
function moscowDate(daysOffset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(10, 0, 0, 0);
  return d;
}

// cardImg: shown in event card grid (eventCardUrl + thumbnailUrl)
// coverImg: shown in MainEventsBanner carousel (mainEventUrl) — only for mainEvent records
// All paths under /events/ are served from apps/frontend/public/events/
const EVENTS: Array<{
  id: string;
  title: string;
  shortDescription: string;
  daysOffset: number;
  mainEvent: boolean;
  cardImg: string;
  coverImg?: string;
}> = [
  {
    id: 'staging-design-event-1',
    title: 'Вебинар: Изменения в налоговом законодательстве 2026',
    shortDescription: 'Разбираем ключевые поправки к НК РФ и их влияние на работу бухгалтера.',
    daysOffset: 1,
    mainEvent: true,
    cardImg: '/events/event-card-1.png',
    coverImg: '/events/event-cover-1.png',
  },
  {
    id: 'staging-design-event-2',
    title: 'Семинар: Переход на ЕНС — практические кейсы',
    shortDescription: 'Практические сценарии зачёта и возврата переплат через единый налоговый счёт.',
    daysOffset: 3,
    mainEvent: true,
    cardImg: '/events/event-card-2.png',
    coverImg: '/events/event-cover-2.png',
  },
  {
    id: 'staging-design-event-3',
    title: 'Мастер-класс: 1С:Бухгалтерия 8 — продвинутые техники',
    shortDescription: 'Автоматизация рутинных операций, работа с отчётами, типичные ошибки.',
    daysOffset: 5,
    mainEvent: true,
    cardImg: '/events/event-card-3.png',
    coverImg: '/events/event-cover-3.png',
  },
  {
    id: 'staging-design-event-4',
    title: 'Конференция: Профессиональный рост бухгалтера',
    shortDescription: 'Ежегодная встреча сообщества: карьерные треки, нетворкинг, актуальная практика.',
    daysOffset: 7,
    mainEvent: true,
    cardImg: '/events/event-card-4.png',
    coverImg: '/events/event-cover-4.png',
  },
  {
    id: 'staging-design-event-5',
    title: 'Курс: НДС для практика — полный разбор',
    shortDescription: 'Четыре занятия по всем аспектам НДС: вычеты, возвраты, типичные риски.',
    daysOffset: 10,
    mainEvent: true,
    cardImg: '/events/event-card-5.png',
    coverImg: '/events/event-cover-5.png',
  },
  {
    id: 'staging-design-event-6',
    title: 'Онлайн-встреча: Кадровый учёт и трудовые споры',
    shortDescription: 'Кадровая документация, электронные трудовые книжки, судебная практика.',
    daysOffset: 14,
    mainEvent: false,
    cardImg: '/events/event-card-6.png',
  },
];

async function main() {
  console.log('[seed-staging-design] Running...');
  console.log(`[seed-staging-design] FRONTEND_URL=${FRONTEND_URL}`);

  for (const ev of EVENTS) {
    const startDate = moscowDate(ev.daysOffset);
    await prisma.event.upsert({
      where: { id: ev.id },
      update: {
        title: ev.title,
        shortDescription: ev.shortDescription,
        startDate,
        status: 'PUBLISHED',
        autoStatus: 'PLANNED',
        mainEvent: ev.mainEvent,
        format: 'ONLINE',
        priceType: 'FREE',
        publishedAt: new Date(),
      },
      create: {
        id: ev.id,
        title: ev.title,
        shortDescription: ev.shortDescription,
        startDate,
        status: 'PUBLISHED',
        autoStatus: 'PLANNED',
        mainEvent: ev.mainEvent,
        format: 'ONLINE',
        priceType: 'FREE',
        isOnline: true,
        publishedAt: new Date(),
      },
    });

    // Upsert EventImage — deterministic id ensures idempotency
    const imageId = `staging-design-image-${ev.id.replace('staging-design-event-', '')}`;
    await prisma.eventImage.upsert({
      where: { eventId: ev.id },
      update: {
        eventCardUrl: `${FRONTEND_URL}${ev.cardImg}`,
        thumbnailUrl: `${FRONTEND_URL}${ev.cardImg}`,
        mainEventUrl: ev.coverImg ? `${FRONTEND_URL}${ev.coverImg}` : null,
        originalUrl: `${FRONTEND_URL}${ev.cardImg}`,
      },
      create: {
        id: imageId,
        eventId: ev.id,
        eventCardUrl: `${FRONTEND_URL}${ev.cardImg}`,
        thumbnailUrl: `${FRONTEND_URL}${ev.cardImg}`,
        mainEventUrl: ev.coverImg ? `${FRONTEND_URL}${ev.coverImg}` : null,
        originalUrl: `${FRONTEND_URL}${ev.cardImg}`,
      },
    });

    console.log(`  upserted: ${ev.id} → card=${ev.cardImg}${ev.coverImg ? ` cover=${ev.coverImg}` : ''}`);
  }

  console.log('[seed-staging-design] Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
