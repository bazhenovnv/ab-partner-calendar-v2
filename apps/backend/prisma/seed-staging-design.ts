/**
 * Staging-only design seed — creates synthetic PUBLISHED events for visual QA.
 * Guard: only runs when APP_ENV=staging or STAGING_DESIGN_SEED=1.
 * Idempotent: all records use deterministic IDs prefixed with "staging-design-".
 *
 * Creates:
 *   6 regular PUBLISHED events (today + near-future dates, for calendar markers)
 *   5 of those also have mainEvent=true (for MainEventsBanner carousel)
 *
 * Run: ts-node --project tsconfig.json prisma/seed-staging-design.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const EVENTS: Array<{
  id: string;
  title: string;
  shortDescription: string;
  daysOffset: number;
  mainEvent: boolean;
}> = [
  {
    id: 'staging-design-event-1',
    title: 'Вебинар: Изменения в налоговом законодательстве 2026',
    shortDescription: 'Разбираем ключевые поправки к НК РФ и их влияние на работу бухгалтера.',
    daysOffset: 1,
    mainEvent: true,
  },
  {
    id: 'staging-design-event-2',
    title: 'Семинар: Переход на ЕНС — практические кейсы',
    shortDescription: 'Практические сценарии зачёта и возврата переплат через единый налоговый счёт.',
    daysOffset: 3,
    mainEvent: true,
  },
  {
    id: 'staging-design-event-3',
    title: 'Мастер-класс: 1С:Бухгалтерия 8 — продвинутые техники',
    shortDescription: 'Автоматизация рутинных операций, работа с отчётами, типичные ошибки.',
    daysOffset: 5,
    mainEvent: true,
  },
  {
    id: 'staging-design-event-4',
    title: 'Конференция: Профессиональный рост бухгалтера',
    shortDescription: 'Ежегодная встреча сообщества: карьерные треки, нетворкинг, актуальная практика.',
    daysOffset: 7,
    mainEvent: true,
  },
  {
    id: 'staging-design-event-5',
    title: 'Курс: НДС для практика — полный разбор',
    shortDescription: 'Четыре занятия по всем аспектам НДС: вычеты, возвраты, типичные риски.',
    daysOffset: 10,
    mainEvent: true,
  },
  {
    id: 'staging-design-event-6',
    title: 'Онлайн-встреча: Кадровый учёт и трудовые споры',
    shortDescription: 'Кадровая документация, электронные трудовые книжки, судебная практика.',
    daysOffset: 14,
    mainEvent: false,
  },
];

async function main() {
  console.log('[seed-staging-design] Running...');

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
    console.log(`  upserted: ${ev.id}`);
  }

  console.log('[seed-staging-design] Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
