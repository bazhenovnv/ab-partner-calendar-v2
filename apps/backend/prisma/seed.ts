import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_DIRECTIONS, HASHTAG_TO_DIRECTIONS, FOOTER_PROJECTS, LEGAL_OPERATOR, CONTACT_EMAIL } from '@ab-afisha/shared';

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

  // PLACEHOLDER CONTENT — replace via admin after loading the official DOCX/PDF package
  // (AB_Afisha_legal_and_TZ_v11_package.zip). These texts are fallback stubs only.
  const legalDocs = [
    {
      type: 'PRIVACY_POLICY' as const,
      title: 'Политика конфиденциальности',
      content: `<h2>Политика конфиденциальности</h2><p>Настоящая Политика определяет порядок обработки персональных данных пользователей сайта ab-event.pro.</p><h3>Оператор</h3><p>${LEGAL_OPERATOR.name}, ОГРН ${LEGAL_OPERATOR.ogrn}, ИНН ${LEGAL_OPERATOR.inn}.<br/>Адрес: ${LEGAL_OPERATOR.address}.<br/>Email: ${CONTACT_EMAIL}</p>`,
    },
    {
      type: 'USER_AGREEMENT' as const,
      title: 'Пользовательское соглашение',
      content: `<h2>Пользовательское соглашение</h2><p>Настоящее Соглашение регулирует использование сайта ab-event.pro.</p><h3>Оператор</h3><p>${LEGAL_OPERATOR.name}, ОГРН ${LEGAL_OPERATOR.ogrn}, ИНН ${LEGAL_OPERATOR.inn}.<br/>Адрес: ${LEGAL_OPERATOR.address}.<br/>Email: ${CONTACT_EMAIL}</p>`,
    },
    {
      type: 'PERSONAL_DATA_CONSENT' as const,
      title: 'Согласие на обработку персональных данных',
      content: `<h2>Согласие на обработку персональных данных</h2><p>Настоящим даю согласие ${LEGAL_OPERATOR.name} (ОГРН ${LEGAL_OPERATOR.ogrn}, ИНН ${LEGAL_OPERATOR.inn}) на обработку моих персональных данных в целях использования сайта ab-event.pro и Telegram/MAX-ботов.</p>`,
    },
    {
      type: 'COOKIE_POLICY' as const,
      title: 'Политика Cookie и аналитики',
      content: `<h2>Политика Cookie и аналитики</h2><p>Сайт ab-event.pro использует cookie-файлы и инструменты веб-аналитики (Яндекс.Метрика) для корректной работы, анализа посещаемости, улучшения сервиса и диагностики ошибок.</p><p>Продолжая использовать сайт, вы соглашаетесь с обработкой данных согласно настоящей Политике и <a href="/legal/privacy">Политике конфиденциальности</a>.</p><h3>Оператор</h3><p>${LEGAL_OPERATOR.name}, ОГРН ${LEGAL_OPERATOR.ogrn}, ИНН ${LEGAL_OPERATOR.inn}.<br/>Email: ${CONTACT_EMAIL}</p>`,
    },
    {
      type: 'BROADCAST_CONSENT' as const,
      title: 'Согласие на информационные рассылки',
      content: `<h2>Согласие на информационные рассылки</h2><p>Используя Telegram/MAX-бот сайта ab-event.pro, вы даёте согласие ${LEGAL_OPERATOR.name} (ОГРН ${LEGAL_OPERATOR.ogrn}, ИНН ${LEGAL_OPERATOR.inn}) на получение информационных сообщений об анонсах мероприятий, новостях и проектах.</p><p>Вы можете отписаться от информационных рассылок в любой момент через команду бота «Отписаться от рассылок». Сервисные напоминания о мероприятиях продолжат работу после отписки.</p><p>Отписка от рассылок не является отзывом согласия на обработку персональных данных.</p><h3>Оператор</h3><p>${LEGAL_OPERATOR.name}, ОГРН ${LEGAL_OPERATOR.ogrn}, ИНН ${LEGAL_OPERATOR.inn}.<br/>Email: ${CONTACT_EMAIL}</p>`,
    },
  ];

  for (const doc of legalDocs) {
    await prisma.legalDoc.upsert({
      where: { type: doc.type },
      update: {},
      create: { ...doc, isDraft: false, publishedAt: new Date() },
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
