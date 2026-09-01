import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const page = read('apps/frontend/src/app/admin/events/[id]/page.tsx');

test('event editor keeps the source URL visible and adds navigation beside it', () => {
  assert.match(page, /Ссылка на источник/);
  assert.match(page, /value=\{sourcePostUrl\}/);
  assert.match(page, /readOnly/);
  assert.match(page, /sourcePostUrl\.includes\('\/join\/'\)/);
  assert.match(page, /Открыть канал MAX/);
  assert.match(page, /Перейти на источник/);
  assert.match(page, /display: 'flex'/);
  assert.match(page, /gap: '0\.5rem'/);
});

test('source navigation validates HTTP(S) but does not rewrite the displayed source URL', () => {
  assert.match(page, /const sourcePostUrl = typeof sourcePostUrlValue === 'string' \? sourcePostUrlValue : ''/);
  assert.match(page, /const sourceHref = safeHttpUrl\(sourcePostUrl\)/);
  assert.match(page, /url\.protocol !== 'https:' && url\.protocol !== 'http:'/);
  assert.match(page, /return candidate/);
  assert.match(page, /href=\{sourceHref\}/);
});

test('source navigation opens safely in a new tab and the old header action is removed', () => {
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.doesNotMatch(page, /NeedsAttentionMaxSourceLink/);
  assert.doesNotMatch(page, /Перейти к событию/);
});
