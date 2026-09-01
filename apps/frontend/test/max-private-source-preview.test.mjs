import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const PAGE = read('apps/frontend/src/app/admin/events/[id]/page.tsx');
const PREVIEW = read('apps/frontend/src/components/admin/MaxSourcePreviewCard.tsx');

describe('MAX private source preview in event editor', () => {
  test('renders the source preview next to editable event data', () => {
    assert.match(PAGE, /MaxSourcePreviewCard/);
    assert.match(PAGE, /<MaxSourcePreviewCard event=\{event\} \/>/);
    assert.match(PAGE, /sourcePostUrl\.includes\('\/join\/'\)/);
    assert.match(PAGE, /Открыть канал MAX/);
    assert.match(PAGE, /Перейти на источник/);
  });

  test('shows the exact MAX message without requiring manual channel search', () => {
    assert.match(PREVIEW, /\/events\/admin\/\$\{eventId\}\/source-preview/);
    assert.match(PREVIEW, /Исходный пост MAX/);
    assert.match(PREVIEW, /Канал MAX приватный/);
    assert.match(PREVIEW, /искать[\s\S]*вручную[\s\S]*не требуется/);
    assert.match(PREVIEW, /preview\.message\.text/);
    assert.match(PREVIEW, /preview\.message\?\.attachments/);
    assert.match(PREVIEW, /Опубликовано:/);
    assert.match(PREVIEW, /Перейти к посту MAX/);
    assert.match(PREVIEW, /Открыть канал MAX/);
    assert.doesNotMatch(PREVIEW, /dangerouslySetInnerHTML/);
  });
});
