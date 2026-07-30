import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_DIRECTIONS, HASHTAG_TO_DIRECTIONS, FOOTER_PROJECTS, LEGAL_DOCUMENTS, LEGAL_DOCUMENT_TYPES } from '@ab-afisha/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'changeme_in_production';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ab-event.pro';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: 'Администратор',
      role: 'ADMIN',
    },
  });

  for (let i = 0; i < DEFAULT_DIRECTIONS.length; i++) {
    const d = DEFAULT_DIRECTIONS[i];
    await prisma.direction.upsert({
      where: { slug: d.slug },
      update: { name: d.name, sortOrder: i },
      create: { name: d.name, slug: d.slug, sortOrder: i },
    });
  }

  for (const [hashtag, directionSlugs] of Object.entries(HASHTAG_TO_DIRECTIONS)) {
    const isMainEvent = hashtag === '#Хит';
    await prisma.hashtagMapping.upsert({
      where: { hashtag },
      update: { isMainEvent },
      create: { hashtag, isMainEvent },
    });
    if (directionSlugs.length > 0) {
      const dir = await prisma.direction.findFirst({ where: { slug: directionSlugs[0] } });
      if (dir) {
        await prisma.hashtagMapping.update({
          where: { hashtag },
          data: { directionId: dir.id },
        });
      }
    }
  }

  for (let i = 0; i < FOOTER_PROJECTS.length; i++) {
    const p = FOOTER_PROJECTS[i];
    await prisma.footerProject.upsert({
      where: { id: `footer-${i}` },
      update: { title: p.title, url: p.url, sortOrder: i },
      create: { id: `footer-${i}`, title: p.title, url: p.url, sortOrder: i },
    });
  }

  const quotes = [
    { text: 'Бухгалтер — это тот, кто решает проблемы, о существовании которых вы не подозревали, способами, которых вы не понимаете.', author: null },
    { text: 'Знание законов не освобождает от налогов, но иногда помогает их оптимизировать.', author: null },
    { text: 'Профессиональный рост — это не случайность, это результат постоянного обучения.', author: null },
  ];
  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i];
    await prisma.quote.upsert({
      where: { id: `seed-quote-${i}` },
      update: {},
      create: { id: `seed-quote-${i}`, text: q.text, author: q.author, sortOrder: i },
    });
  }

  const legalPublishedAt = new Date('2026-07-01T00:00:00+03:00');

  for (const type of LEGAL_DOCUMENT_TYPES) {
    const doc = LEGAL_DOCUMENTS[type];
    await prisma.legalDoc.upsert({
      where: { type },
      update: {},
      create: { type, ...doc, isDraft: false, publishedAt: legalPublishedAt },
    });
  }

  await prisma.siteConfig.upsert({
    where: { key: 'bot.phoneRequired' },
    update: {},
    create: { key: 'bot.phoneRequired', value: false },
  });

  const cookieConfig: { key: string; value: unknown }[] = [
    { key: 'cookie.noticeEnabled', value: true },
    {
      key: 'cookie.noticeText',
      value:
        'Мы используем cookie и аналитику, чтобы сайт работал корректно, а также для анализа посещаемости, улучшения сервиса и диагностики ошибок. Продолжая пользоваться сайтом, вы соглашаетесь с обработкой данных в соответствии с Политикой конфиденциальности.',
    },
    { key: 'cookie.buttonText', value: 'Понятно' },
  ];

  for (const cfg of cookieConfig) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: { key: cfg.key, value: cfg.value as any },
    });
  }

  const broadcastConfig: { key: string; value: unknown }[] = [
    { key: 'broadcast.enabled', value: false },
    { key: 'broadcast.telegramRatePerSecond', value: 20 },
    { key: 'broadcast.maxRatePerSecond', value: 10 },
    { key: 'broadcast.cooldownHours', value: 24 },
    { key: 'broadcast.testSendRequired', value: true },
    { key: 'broadcast.allowSimultaneous', value: false },
    { key: 'broadcast.maxRecipients', value: 0 },
    { key: 'broadcast.defaultUnsubscribeText', value: 'Отписаться от рассылок' },
  ];

  for (const cfg of broadcastConfig) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: { key: cfg.key, value: cfg.value as any },
    });
  }

  const maintenanceConfig = [
    { key: 'maintenance.enabled', value: false },
    { key: 'maintenance.title', value: 'Технические работы' },
    {
      key: 'maintenance.description',
      value: 'Сайт временно недоступен. Мы работаем над улучшениями. Пожалуйста, зайдите позже.',
    },
    { key: 'maintenance.imageUrl', value: '' },
  ];

  for (const cfg of maintenanceConfig) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: { key: cfg.key, value: cfg.value as any },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
