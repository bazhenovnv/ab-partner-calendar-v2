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

// ── Helper ────────────────────────────────────────────────────────────────────

function src(relPath) {
  return join(BACKEND, 'src', relPath);
}

function feRoute(relPath) {
  return join(FRONTEND, 'src/app', relPath);
}

function fileContains(filePath, ...patterns) {
  const content = readFileSync(filePath, 'utf8');
  for (const p of patterns) {
    assert.ok(
      content.includes(p),
      `Expected "${p}" in ${filePath}`,
    );
  }
}

// ── Backend: Core modules exist ───────────────────────────────────────────────

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
  ];

  for (const mod of modules) {
    test(`exists: src/${mod}`, () => {
      assert.ok(existsSync(src(mod)), `Missing: apps/backend/src/${mod}`);
    });
  }
});

// ── Backend: JWT_SECRET is required (no fallback) ─────────────────────────────

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

// ── Backend: Admin routes are guarded ─────────────────────────────────────────

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

// ── Backend: Public endpoints declared ───────────────────────────────────────

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

// ── Backend: Logger used in main.ts (no raw console.log) ─────────────────────

describe('Backend — logging', () => {
  test('main.ts uses Logger instead of console.log', () => {
    const content = readFileSync(src('main.ts'), 'utf8');
    assert.ok(!content.includes('console.log'), 'console.log still in main.ts');
    assert.ok(content.includes('Logger'), 'Logger not used in main.ts');
  });
});

// ── Frontend: Key route files exist ──────────────────────────────────────────

describe('Frontend — public route files exist', () => {
  const routes = [
    'page.tsx',               // home
    'events/[id]/page.tsx',   // event detail
    'legal/[slug]/page.tsx',  // legal pages
    'layout.tsx',             // root layout
    'loading.tsx',            // loading state
    'error.tsx',              // error boundary
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
    'admin/page.tsx',              // dashboard
    'admin/login/page.tsx',
    'admin/events/page.tsx',
    'admin/quotes/page.tsx',
    'admin/cities/page.tsx',
    'admin/directions/page.tsx',
    'admin/broadcasts/page.tsx',
    'admin/settings/page.tsx',
    'admin/legal/[type]/page.tsx',
  ];

  for (const route of adminRoutes) {
    test(`exists: app/${route}`, () => {
      assert.ok(existsSync(feRoute(route)), `Missing: apps/frontend/src/app/${route}`);
    });
  }
});

// ── Frontend: Admin layout has auth redirect ──────────────────────────────────

describe('Frontend — admin auth guard', () => {
  test('AdminLayoutClient.tsx redirects unauthenticated users to /admin/login', () => {
    fileContains(feRoute('admin/AdminLayoutClient.tsx'), '/admin/login', 'token');
  });
});

// ── Config: .env.example has required vars ────────────────────────────────────

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
