import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const BRIDGE = readFileSync(
  resolve(FRONTEND, 'src/components/events/MainEventsCarouselBridge.tsx'),
  'utf8',
);
const PAGE = readFileSync(resolve(FRONTEND, 'src/app/page.tsx'), 'utf8');
const ADMIN_PAGE = readFileSync(
  resolve(FRONTEND, 'src/app/admin/main-events/page.tsx'),
  'utf8',
);

describe('Main-events ingestion boundary', () => {
  test('uses the backend main-event selection on the production page', () => {
    assert.match(PAGE, /MainEventsCarouselBridge/);
    assert.match(PAGE, /<MainEventsCarouselBridge events=\{main\} \/>/);
  });

  test('allows only dedicated mainEventUrl artwork into the legacy banner', () => {
    assert.match(BRIDGE, /mainEventUrl\?\.trim\(\)/);
    assert.match(BRIDGE, /\.filter\(\(event\) => Boolean\(event\.images\?\.\[0\]\?\.mainEventUrl\?\.trim\(\)\)\)/);
    assert.match(BRIDGE, /originalUrl: image\.mainEventUrl\?\.trim\(\) \|\| null/);
    assert.ok(BRIDGE.includes('<!-- #хит -->'));
    assert.match(BRIDGE, /<MainEventsBanner events=\{canonicalEvents\} \/>/);
  });

  test('admin page mirrors the public five-item selection rules', () => {
    assert.match(ADMIN_PAGE, /item\.status === 'PUBLISHED' && hasDedicatedCover\(item\)/);
    assert.match(ADMIN_PAGE, /item\.autoStatus === 'PLANNED' \|\| item\.autoStatus === 'LIVE'/);
    assert.match(ADMIN_PAGE, /\.slice\(0, 5\)/);
    assert.match(ADMIN_PAGE, /5 - active\.length/);
    assert.match(ADMIN_PAGE, /Нет обложки mainEventUrl/);
    assert.match(ADMIN_PAGE, /Не входит в первые 5/);
  });
});
