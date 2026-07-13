/**
 * Development-only fixture data for visual QA without a running backend.
 * Activated only when NEXT_PUBLIC_DEV_FIXTURES=1 AND NODE_ENV=development.
 * NEVER imported or bundled in production or staging builds.
 *
 * IMPORTANT — QA placeholder content only:
 * Titles, descriptions, and quote texts below are NOT approved editorial content.
 * They exist solely to exercise the UI layout during local development.
 * Canonical staging content lives in apps/backend/prisma/seed-staging-design.ts
 * and apps/backend/prisma/seed-staging-quotes.ts.
 * Never copy fixture texts into the database, seed files, or production.
 */

import type { PublicEvent, PublicEventsResponse } from '@/types/event';
import type { PublicQuote } from '@/lib/api';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('dev-fixtures.ts must not be imported in production');
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export const DEV_MAIN_EVENTS: PublicEvent[] = [
  {
    id: 'fix-main-1',
    title: 'Единый торг — Семинар 1С',
    shortDescription: 'Обучение работе в 1С для бухгалтеров: практические кейсы.',
    startDate: daysFromNow(1),
    format: 'OFFLINE',
    priceType: 'FREE',
    autoStatus: 'PLANNED',
    mainEvent: true,
    ticketSalesEnabled: false,
    images: [{ eventCardUrl: '/events/event-cover-1.png', thumbnailUrl: '/events/event-cover-1.png' }],
    directions: [],
  },
  {
    id: 'fix-main-2',
    title: 'Вебинар: Налоговые проверки 2026',
    shortDescription: 'Правила контроля, риски бизнеса и практика защиты.',
    startDate: daysFromNow(3),
    format: 'ONLINE',
    priceType: 'FREE',
    autoStatus: 'PLANNED',
    mainEvent: true,
    ticketSalesEnabled: false,
    images: [{ eventCardUrl: '/events/event-cover-2.png', thumbnailUrl: '/events/event-cover-2.png' }],
    directions: [],
  },
  {
    id: 'fix-main-3',
    title: 'Инструкция аватара: Сильные стороны личности',
    shortDescription: 'Супер тренинг для души и тела: история одного богача.',
    startDate: daysFromNow(5),
    format: 'ONLINE',
    priceType: 'PAID',
    autoStatus: 'PLANNED',
    mainEvent: true,
    ticketSalesEnabled: true,
    images: [{ eventCardUrl: '/events/event-cover-3.png', thumbnailUrl: '/events/event-cover-3.png' }],
    directions: [],
  },
  {
    id: 'fix-main-4',
    title: 'Вебинар: Оплата труда, НДФЛ и взносы',
    shortDescription: 'Позиция судебника Екатеринбурга — судебная практика.',
    startDate: daysFromNow(7),
    format: 'ONLINE',
    priceType: 'FREE',
    autoStatus: 'PLANNED',
    mainEvent: true,
    ticketSalesEnabled: false,
    images: [{ eventCardUrl: '/events/event-cover-4.png', thumbnailUrl: '/events/event-cover-4.png' }],
    directions: [],
  },
  {
    id: 'fix-main-5',
    title: 'Международный форум «НАРОД»',
    shortDescription: 'Приглашаем спецгостей для участия в Екатеринбурге.',
    startDate: daysFromNow(10),
    format: 'OFFLINE',
    priceType: 'PAID',
    autoStatus: 'PLANNED',
    mainEvent: true,
    ticketSalesEnabled: true,
    images: [{ eventCardUrl: '/events/event-cover-5.png', thumbnailUrl: '/events/event-cover-5.png' }],
    directions: [],
  },
];

export const DEV_EVENTS_RESPONSE: PublicEventsResponse = {
  total: 6,
  isFallback: true,
  events: [
    {
      id: 'fix-ev-1',
      title: 'Бухгалтерский учёт и налогообложение в 2026 году',
      shortDescription: 'Ключевые изменения законодательства для главных бухгалтеров.',
      startDate: daysFromNow(1),
      format: 'ONLINE',
      priceType: 'FREE',
      autoStatus: 'PLANNED',
      mainEvent: false,
      ticketSalesEnabled: false,
      images: [{ eventCardUrl: '/events/event-card-1.png', thumbnailUrl: '/events/event-card-1.png' }],
      directions: [],
    },
    {
      id: 'fix-ev-2',
      title: 'Главный навык мая: расчёт и оплата труда, особенности приёма, увольнения, выплат премий',
      shortDescription: 'Всё о кадровом учёте и расчёте зарплаты.',
      startDate: daysFromNow(3),
      format: 'ONLINE',
      priceType: 'FREE',
      autoStatus: 'PLANNED',
      mainEvent: false,
      ticketSalesEnabled: false,
      images: [{ eventCardUrl: '/events/event-card-2.png', thumbnailUrl: '/events/event-card-2.png' }],
      directions: [],
    },
    {
      id: 'fix-ev-3',
      title: 'Офисные расходы: что можно списать и что потом объяснять налоговой',
      shortDescription: 'Практика работы с расходами в бухгалтерском учёте.',
      startDate: daysFromNow(5),
      format: 'ONLINE',
      priceType: 'FREE',
      autoStatus: 'PLANNED',
      mainEvent: false,
      ticketSalesEnabled: false,
      images: [{ eventCardUrl: '/events/event-card-3.png', thumbnailUrl: '/events/event-card-3.png' }],
      directions: [],
    },
    {
      id: 'fix-ev-4',
      title: '«Где мои деньги?» — Мастер-класс про финансы без иллюзий',
      shortDescription: 'Финансовая грамотность для специалистов в области учёта.',
      startDate: daysFromNow(7),
      format: 'OFFLINE',
      priceType: 'FREE',
      autoStatus: 'PLANNED',
      mainEvent: false,
      ticketSalesEnabled: false,
      images: [{ eventCardUrl: '/events/event-card-4.png', thumbnailUrl: '/events/event-card-4.png' }],
      directions: [],
    },
    {
      id: 'fix-ev-5',
      title: 'Новые требования на камеральных упрощёнщиков: что срочно менять в работе',
      shortDescription: 'Актуальные изменения для упрощённой системы налогообложения.',
      startDate: daysFromNow(10),
      format: 'ONLINE',
      priceType: 'FREE',
      autoStatus: 'PLANNED',
      mainEvent: false,
      ticketSalesEnabled: false,
      images: [{ eventCardUrl: '/events/event-card-5.png', thumbnailUrl: '/events/event-card-5.png' }],
      directions: [],
    },
    {
      id: 'fix-ev-6',
      title: 'Бизнес под угрозой: риски в 2026 году',
      shortDescription: 'Анализ актуальных рисков для малого и среднего бизнеса.',
      startDate: daysFromNow(14),
      format: 'ONLINE',
      priceType: 'FREE',
      autoStatus: 'PLANNED',
      mainEvent: false,
      ticketSalesEnabled: false,
      images: [{ eventCardUrl: '/events/event-card-6.png', thumbnailUrl: '/events/event-card-6.png' }],
      directions: [],
    },
  ],
};

export const DEV_QUOTES: PublicQuote[] = [
  {
    id: 'fix-q-1',
    text: 'Компетентность – это результат постоянного обучения, а не единовременного образования.',
    author: '',
  },
  {
    id: 'fix-q-2',
    text: 'Бухгалтер — это не тот, кто считает деньги, а тот, кто делает бизнес прозрачным.',
    author: '',
  },
  {
    id: 'fix-q-3',
    text: 'Порядок в учёте — это порядок в голове и в бизнесе.',
    author: '',
  },
  {
    id: 'fix-q-4',
    text: 'Профессионал тем и отличается, что видит не ошибки, а точки роста.',
    author: '',
  },
  {
    id: 'fix-q-5',
    text: 'Налоговое планирование — это не уклонение, это честная оптимизация.',
    author: '',
  },
];
