/**
 * Staging-only quotes seed — creates synthetic Quote rows for visual QA.
 * Guard: only runs when APP_ENV=staging or STAGING_DESIGN_SEED=1.
 * Idempotent: deterministic IDs prefixed "staging-quote-".
 *
 * Quotes taken from the approved set in prisma/seed.ts + 2 thematic additions.
 *
 * Run:
 *   cd apps/backend
 *   STAGING_DESIGN_SEED=1 npx ts-node --project tsconfig.json prisma/seed-staging-quotes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GUARD =
  process.env.APP_ENV === 'staging' || process.env.STAGING_DESIGN_SEED === '1';

if (!GUARD) {
  console.log('[seed-staging-quotes] Skipped: APP_ENV != staging and STAGING_DESIGN_SEED != 1');
  process.exit(0);
}

const QUOTES: Array<{ id: string; text: string; author: string | null; sortOrder: number }> = [
  {
    id: 'staging-quote-0',
    text: 'Бухгалтер — это тот, кто решает проблемы, о существовании которых вы не подозревали, способами, которых вы не понимаете.',
    author: null,
    sortOrder: 0,
  },
  {
    id: 'staging-quote-1',
    text: 'Знание законов не освобождает от налогов, но иногда помогает их оптимизировать.',
    author: null,
    sortOrder: 1,
  },
  {
    id: 'staging-quote-2',
    text: 'Профессиональный рост — это не случайность, это результат постоянного обучения.',
    author: null,
    sortOrder: 2,
  },
  {
    id: 'staging-quote-3',
    text: 'Каждый налог — это цена, которую общество платит за цивилизацию.',
    author: 'Оливер Холмс',
    sortOrder: 3,
  },
  {
    id: 'staging-quote-4',
    text: 'Хороший бухгалтер знает закон. Отличный бухгалтер знает судью.',
    author: null,
    sortOrder: 4,
  },
];

async function main() {
  console.log('[seed-staging-quotes] Running...');

  for (const q of QUOTES) {
    await prisma.quote.upsert({
      where: { id: q.id },
      update: {
        text: q.text,
        author: q.author,
        sortOrder: q.sortOrder,
        isActive: true,
      },
      create: {
        id: q.id,
        text: q.text,
        author: q.author,
        sortOrder: q.sortOrder,
        isActive: true,
      },
    });
    console.log(`  upserted: ${q.id}`);
  }

  console.log('[seed-staging-quotes] Done. 5 quotes upserted.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
