import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const EVENTS_PAGE = readFileSync(
  resolve(FRONTEND, 'src/app/admin/events/page.tsx'),
  'utf8',
);
const ADMIN_LAYOUT = readFileSync(
  resolve(FRONTEND, 'src/app/admin/AdminLayoutClient.tsx'),
  'utf8',
);

describe('Admin needs-attention navigation', () => {
  test('events tab routes to the dedicated needs-attention page', () => {
    assert.match(EVENTS_PAGE, /href="\/admin\/needs-attention"/);
    assert.match(EVENTS_PAGE, /router\.push\('\/admin\/needs-attention'\)/);
  });

  test('sidebar owns a distinct needs-attention menu item', () => {
    assert.match(
      ADMIN_LAYOUT,
      /href: '\/admin\/needs-attention', label: 'Требует внимания'/,
    );
  });

  test('events page no longer treats needs-attention as a local quick-tab state', () => {
    assert.doesNotMatch(
      EVENTS_PAGE,
      /setStatus\('NEEDS_ATTENTION'\)/,
    );
  });
});
