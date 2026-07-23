/**
 * Frontend smoke tests — route file existence checks.
 * Uses Node.js built-in test runner (node:test), zero extra dependencies.
 * Run: node --test apps/frontend/test/smoke.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const FRONTEND = resolve(import.meta.dirname, '..');
const SRC = join(FRONTEND, 'src');

function app(relPath) {
  return join(SRC, 'app', relPath);
}

function lib(relPath) {
  return join(SRC, relPath);
}

// ── Public routes ─────────────────────────────────────────────────────────────

describe('Public site routes exist', () => {
  const routes = [
    ['home page', 'page.tsx'],
    ['root layout', 'layout.tsx'],
    ['loading state', 'loading.tsx'],
    ['error boundary', 'error.tsx'],
    ['event detail', 'events/[id]/page.tsx'],
    ['legal page', 'legal/[slug]/page.tsx'],
    ['maintenance page', 'maintenance/page.tsx'],
  ];

  for (const [label, path] of routes) {
    test(label, () => {
      assert.ok(existsSync(app(path)), `Missing: src/app/${path}`);
    });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

describe('Admin routes exist', () => {
  const routes = [
    ['admin layout', 'admin/layout.tsx'],
    ['admin dashboard', 'admin/page.tsx'],
    ['admin login', 'admin/login/page.tsx'],
    ['admin events list', 'admin/events/page.tsx'],
    ['admin quotes list', 'admin/quotes/page.tsx'],
    ['admin cities list', 'admin/cities/page.tsx'],
    ['admin directions list', 'admin/directions/page.tsx'],
    ['admin broadcasts list', 'admin/broadcasts/page.tsx'],
    ['admin broadcast detail', 'admin/broadcasts/[id]/page.tsx'],
    ['admin settings', 'admin/settings/page.tsx'],
    ['admin legal', 'admin/legal/[type]/page.tsx'],
  ];

  for (const [label, path] of routes) {
    test(label, () => {
      assert.ok(existsSync(app(path)), `Missing: src/app/${path}`);
    });
  }
});

// ── Key components exist ──────────────────────────────────────────────────────

describe('Key components exist', () => {
  const components = [
    'components/layout/SiteHeader.tsx',
    'components/layout/SiteFooter.tsx',
    'components/events/EventsSection.tsx',
    'components/events/EventDetailActions.tsx',
    'components/MetrikaPageview.tsx',
    'lib/admin-api.ts',
    'lib/metrika.ts',
  ];

  for (const path of components) {
    test(path, () => {
      assert.ok(existsSync(lib(path)), `Missing: src/${path}`);
    });
  }
});

// ── Admin auth guard ──────────────────────────────────────────────────────────

describe('Admin auth guard', () => {
  test('AdminLayoutClient redirects unauthenticated to /admin/login', () => {
    const content = readFileSync(app('admin/AdminLayoutClient.tsx'), 'utf8');
    assert.ok(content.includes('/admin/login'), 'Missing /admin/login redirect');
    assert.ok(
      content.includes('token') || content.includes('auth'),
      'Missing auth check in AdminLayoutClient',
    );
  });
});
