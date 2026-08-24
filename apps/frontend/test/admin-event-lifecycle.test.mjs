import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const api = readFileSync(resolve(ROOT, 'src/lib/admin-api.ts'), 'utf8');
const editor = readFileSync(resolve(ROOT, 'src/app/admin/events/[id]/page.tsx'), 'utf8');

describe('admin event lifecycle UI', () => {
  test('treats 204 and empty successful responses as success', () => {
    assert.match(api, /if \(res\.status === 204\) return undefined as T/);
    assert.match(api, /const text = await res\.text\(\)/);
    assert.match(api, /if \(!text\) return undefined as T/);
  });

  test('offers restore for archived and deleted events', () => {
    assert.match(editor, /const isArchivedOrDeleted = event\.status === 'ARCHIVE' \|\| event\.status === 'DELETED'/);
    assert.match(editor, /\/events\/admin\/\$\{id\}\/restore/);
    assert.match(editor, />\s*Восстановить\s*</);
  });

  test('does not offer delete for an already deleted event', () => {
    assert.match(editor, /const isDeleted = event\.status === 'DELETED'/);
    assert.match(editor, /\{!isDeleted && \(/);
    assert.match(editor, /Удалённое мероприятие сначала нужно восстановить/);
  });

  test('prevents double lifecycle clicks and returns to archive', () => {
    assert.match(editor, /const \[lifecycleBusy, setLifecycleBusy\] = useState\(false\)/);
    assert.match(editor, /disabled=\{lifecycleBusy\}/);
    assert.match(editor, /router\.push\('\/admin\/archive'\)/);
  });
});
