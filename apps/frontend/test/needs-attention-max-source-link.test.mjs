import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const page = read('apps/frontend/src/app/admin/events/[id]/page.tsx');
const link = read('apps/frontend/src/components/admin/NeedsAttentionMaxSourceLink.tsx');

test('event edit page renders the MAX source-link control', () => {
  assert.match(page, /NeedsAttentionMaxSourceLink/);
  assert.match(page, /<NeedsAttentionMaxSourceLink event=\{event\} \/>/);
});

test('MAX source link is restricted to needs-attention events with a direct sourcePostUrl', () => {
  assert.match(link, /sourceEvent\.status !== 'NEEDS_ATTENTION'/);
  assert.match(link, /sourceEvent\.source !== 'MAX'/);
  assert.match(link, /typeof sourceEvent\.sourcePostUrl !== 'string'/);
  assert.match(link, /safeHttpUrl\(sourceEvent\.sourcePostUrl\)/);
  assert.match(link, /url\.protocol !== 'https:' && url\.protocol !== 'http:'/);
});

test('MAX source link opens the original event safely in a new tab', () => {
  assert.match(link, />\s*Перейти к событию\s*<\/a>/);
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener noreferrer"/);
  assert.match(link, /href=\{href\}/);
});
