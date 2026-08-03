/**
 * Backend smoke tests — structural / static checks.
 * Uses Node.js built-in test runner (node:test), zero extra dependencies.
 * Run: node --test apps/backend/test/smoke.test.mjs
 *
 * Integration HTTP smoke tests (require running server) live in:
 *   scripts/smoke-integration.sh
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const BACKEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(BACKEND, '../..');
const FRONTEND = resolve(ROOT, 'apps/frontend');

function src(relPath) {
  return join(BACKEND, 'src', relPath);
}

function feRoute(relPath) {
  return join(FRONTEND, 'src/app', relPath);
}

function fileContains(filePath, ...patterns) {
  const content = readFileSync(filePath, 'utf8');
  for (const pattern of patterns) {
    assert.ok(
      content.includes(pattern),
      `Expected "${pattern}" in ${filePath}`,
    );
  }
}

describe('Backend — module files exist', () => {
  const modules = [
    'main.ts',
    'app.module.ts',
    'modules/health/health.controller.ts',
    'modules/health/health.module.ts',
    'modules/auth/auth.module.ts',
    'modules/auth/strategies/jwt.strategy.ts',
    'modules/events/events.controller.ts',
    'modules/events/events.module.ts',
    'modules/quotes/quotes.controller.ts',
    'modules/quotes/quotes.module.ts',
    'modules/legal/legal.controller.ts',
    'modules/legal/legal.module.ts',
    'modules/admin/admin.controller.ts',
    'modules/admin/admin.module.ts',
    'modules/cities/cities.controller.ts',
    'modules/directions/directions.controller.ts',
    'modules/max-import/max-bot-interaction.service.ts',
  ];

  for (const modulePath of modules) {
    test(`exists: src/${modulePath}`, () => {
      assert.ok(existsSync(src(modulePath)), `Missing: apps/backend/src/${modulePath}`);
    });
  }
});

describe('Backend — MAX reminder calendar and time selection', () => {
  test('webhook routes bot callbacks before channel import', () => {
    fileContains(
      src('modules/max-import/max-webhook.controller.ts'),
      'MaxBotInteractionService',
      'handledByBot',
      '!handledByBot',
    );
  });

  test('MAX supports compact calendar, time controls and Apply', () => {
    fileContains(
      src('modules/max-import/max-bot-interaction.service.ts'),
      "update.updateType === 'bot_started'",
      "update.updateType === 'message_callback'",
      'buildReminderCalendar',
      'buildReminderDateTime',
      "type: 'inline_keyboard'",
      'reminder_month:',
      'reminder_date:',
      'reminder_time:',
      'reminder_add',
      'reminder_apply',
      'Применить',
    );
  });

  test('MAX normalization declares interactive update types', () => {
    fileContains(
      src('modules/max-import/max-api.types.ts'),
      "update_type: 'message_callback'",
      "update_type: 'bot_started'",
      "updateType: 'message_callback'",
      "updateType: 'bot_started'",
    );
  });
});

describe('Backend — accepted bot contacts', () => {
  test('contacts and CSV export are admin-only', () => {
    fileContains(
      src('modules/bots/bots.controller.ts'),
      "@Get('contacts')",
      "@Get('contacts/export')",
      'JwtAuthGuard',
      "@Roles('ADMIN')",
      'text/csv',
    );
  });

  test('only users who accepted legal documents are listed and exported', () => {
    fileContains(
      src('modules/bots/bots.service.ts'),
      'findAcceptedContacts',
      'exportAcceptedContactsCsv',
      'legalAcceptedAt: { not: null }',
      'broadcastConsentAcceptedAt',
      'allowMarketingMessages',
    );
  });
});

describe('Backend — JWT security', () => {
  test('auth.module.ts throws on missing JWT_SECRET (no fallback)', () => {
    fileContains(
      src('modules/auth/auth.module.ts'),
      'JWT_SECRET',
      'throw new Error',
    );
  });

  test('jwt.strategy.ts throws on missing JWT_SECRET (no fallback)', () => {
    fileContains(
      src('modules/auth/strategies/jwt.strategy.ts'),
      'JWT_SECRET',
      'throw new Error',
    );
  });
});

describe('Backend — admin route protection', () => {
  test('admin.controller.ts uses JwtAuthGuard', () => {
    fileContains(src('modules/admin/admin.controller.ts'), 'JwtAuthGuard');
  });

  test('events admin controller uses JwtAuthGuard', () => {
    fileContains(src('modules/events/events.controller.ts'), 'JwtAuthGuard');
  });

  test('quotes admin controller uses JwtAuthGuard', () => {
    fileContains(src('modules/quotes/quotes.controller.ts'), 'JwtAuthGuard');
  });
});

describe('Backend — public endpoints present', () => {
  test('events controller has /public route', () => {
    fileContains(src('modules/events/events.controller.ts'), 'public');
  });

  test('quotes controller has /public route', () => {
    fileContains(src('modules/quotes/quotes.controller.ts'), 'public');
  });

  test('legal controller exposes GET endpoints', () => {
    fileContains(src('modules/legal/legal.controller.ts'), '@Get');
  });
});

describe('Backend — public filter data', () => {
  test('city options include cities present on published imported events', () => {
    fileContains(
      src('modules/filters/filters.service.ts'),
      'this.prisma.event.findMany',
      "status: 'PUBLISHED'",
      'cityName: { not: null }',
      'eventLocation.city',
      'inferredRegion',
      "normalizedName === 'онлайн'",
    );
  });

  test('event list and calendar accept the same location and direction filters', () => {
    fileContains(
      src('modules/events/dto/events-query.dto.ts'),
      'regions?: string[]',
      'cities?: string[]',
      'directions?: string[]',
    );
    fileContains(
      src('modules/events/dto/calendar-query.dto.ts'),
      'regions?: string[]',
      'cities?: string[]',
      'directions?: string[]',
      'autoStatus?',
    );
    fileContains(
      src('modules/events/events.service.ts'),
      'applyPublicFilters',
      'locationFilters',
      'this.applyPublicFilters(where, query)',
    );
  });
});

describe('Backend — logging', () => {
  test('main.ts uses Logger instead of console.log', () => {
    const content = readFileSync(src('main.ts'), 'utf8');
    assert.ok(!content.includes('console.log'), 'console.log still in main.ts');
    assert.ok(content.includes('Logger'), 'Logger not used in main.ts');
  });
});

describe('Frontend — public route files exist', () => {
  const routes = [
    'page.tsx',
    'events/[id]/page.tsx',
    'legal/[slug]/page.tsx',
    'layout.tsx',
    'loading.tsx',
    'error.tsx',
  ];

  for (const route of routes) {
    test(`exists: app/${route}`, () => {
      assert.ok(existsSync(feRoute(route)), `Missing: apps/frontend/src/app/${route}`);
    });
  }
});

describe('Frontend — admin route files exist', () => {
  const adminRoutes = [
    'admin/layout.tsx',
    'admin/page.tsx',
    'admin/login/page.tsx',
    'admin/events/page.tsx',
    'admin/quotes/page.tsx',
    'admin/cities/page.tsx',
    'admin/directions/page.tsx',
    'admin/broadcasts/page.tsx',
    'admin/contacts/page.tsx',
    'admin/settings/page.tsx',
    'admin/legal/[type]/page.tsx',
  ];

  for (const route of adminRoutes) {
    test(`exists: app/${route}`, () => {
      assert.ok(existsSync(feRoute(route)), `Missing: apps/frontend/src/app/${route}`);
    });
  }
});

describe('Frontend — admin auth guard', () => {
  test('AdminLayoutClient.tsx redirects unauthenticated users to /admin/login', () => {
    fileContains(feRoute('admin/AdminLayoutClient.tsx'), '/admin/login', 'token');
  });

  test('Admin menu exposes contacts and subscriber broadcasts', () => {
    fileContains(
      feRoute('admin/AdminLayoutClient.tsx'),
      '/admin/contacts',
      'Контакты пользователей',
      '/admin/broadcasts',
      'Рассылки подписчикам',
    );
  });
});

describe('Config — .env.example completeness', () => {
  test('root .env.example has required variables', () => {
    const envPath = join(ROOT, '.env.example');
    assert.ok(existsSync(envPath), 'Root .env.example missing');
    fileContains(envPath, 'JWT_SECRET', 'NEXT_PUBLIC_API_URL');
  });

  test('backend .env.example has DATABASE_URL and REDIS_PASSWORD', () => {
    fileContains(join(BACKEND, '.env.example'), 'DATABASE_URL', 'REDIS_PASSWORD');
  });

  test('frontend .env.example has NEXT_PUBLIC_MAX_BOT_URL', () => {
    const envPath = join(FRONTEND, '.env.example');
    assert.ok(existsSync(envPath), 'Frontend .env.example missing');
    fileContains(envPath, 'NEXT_PUBLIC_MAX_BOT_URL');
  });
});
