import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const FRONTEND_ADMIN = resolve(ROOT, 'apps/frontend/src/app/admin');
const BACKEND = resolve(ROOT, 'apps/backend/src');

const layout = readFileSync(resolve(FRONTEND_ADMIN, 'AdminLayoutClient.tsx'), 'utf8');
const login = readFileSync(resolve(FRONTEND_ADMIN, 'login/page.tsx'), 'utf8');
const adminController = readFileSync(resolve(BACKEND, 'modules/admin/admin.controller.ts'), 'utf8');
const analyticsController = readFileSync(resolve(BACKEND, 'modules/analytics/analytics.controller.ts'), 'utf8');
const integrationsController = readFileSync(resolve(BACKEND, 'modules/api-sources/api-sources.controller.ts'), 'utf8');
const seed = readFileSync(resolve(ROOT, 'apps/backend/prisma/seed.ts'), 'utf8');

describe('Admin TZ completion', () => {
  const requiredRoutes = [
    'events',
    'needs-attention',
    'main-events',
    'quotes',
    'filters',
    'cities',
    'max-import',
    'integrations',
    'bots-reminders',
    'contacts',
    'analytics',
    'site-builder',
    'settings',
    'users',
    'archive',
    'action-log',
    'error-log',
  ];

  test('contains every TZ admin section as a route', () => {
    for (const route of requiredRoutes) {
      assert.ok(
        existsSync(resolve(FRONTEND_ADMIN, route, 'page.tsx')),
        `Missing admin route: /admin/${route}`,
      );
    }
  });

  test('validates token against /auth/me instead of trusting localStorage only', () => {
    assert.match(layout, /adminApi\.get<Profile>\('\/auth\/me'\)/);
    assert.match(layout, /clearToken\(\)/);
    assert.match(layout, /router\.replace\('\/admin\/login'\)/);
  });

  test('encodes ADMIN and EDITOR access from the TZ', () => {
    assert.match(layout, /type AdminRole = 'ADMIN' \| 'EDITOR'/);
    assert.match(layout, /href: '\/admin\/events'.*\['ADMIN', 'EDITOR'\]/);
    assert.match(layout, /href: '\/admin\/main-events'.*\['ADMIN', 'EDITOR'\]/);
    assert.match(layout, /href: '\/admin\/quotes'.*\['ADMIN', 'EDITOR'\]/);
    assert.match(layout, /href: '\/admin\/analytics'.*\['ADMIN', 'EDITOR'\]/);
    assert.match(layout, /href: '\/admin\/users'.*\['ADMIN'\]/);
    assert.match(layout, /href: '\/admin\/integrations'.*\['ADMIN'\]/);
    assert.match(layout, /href: '\/admin\/bots-reminders'.*\['ADMIN'\]/);
    assert.match(layout, /href: '\/admin\/settings'.*\['ADMIN'\]/);
  });

  test('opens Dashboard after successful login', () => {
    assert.match(login, /router\.replace\('\/admin'\)/);
    assert.doesNotMatch(login, /router\.replace\('\/admin\/broadcasts'\)/);
  });

  test('provides ADMIN-only user and system-control APIs', () => {
    assert.match(adminController, /@Get\('users'\)/);
    assert.match(adminController, /@Post\('users'\)/);
    assert.match(adminController, /@Patch\('users\/:id'\)/);
    assert.match(adminController, /@Post\('users\/:id\/reset-password'\)/);
    assert.match(adminController, /@Get\('archive'\)/);
    assert.match(adminController, /@Get\('action-log'\)/);
    assert.match(adminController, /@Get\('error-log'\)/);
  });

  test('provides analytics for both Admin and Editor', () => {
    assert.match(analyticsController, /@Get\('admin\/overview'\)/);
    assert.match(analyticsController, /@Roles\('ADMIN', 'EDITOR'\)/);
  });

  test('protects integration CRUD for ADMIN', () => {
    assert.match(integrationsController, /@Get\('admin'\)/);
    assert.match(integrationsController, /@Post\('admin'\)/);
    assert.match(integrationsController, /@Patch\('admin\/:id'\)/);
    assert.match(integrationsController, /@Delete\('admin\/:id'\)/);
    assert.match(integrationsController, /@Roles\('ADMIN'\)/);
  });

  test('does not contain the old production fallback admin password', () => {
    assert.doesNotMatch(seed, /changeme_in_production/);
    assert.match(seed, /SEED_ADMIN_PASSWORD/);
    assert.match(seed, /minimum 12 characters/);
  });
});
