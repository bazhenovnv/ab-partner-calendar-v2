import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const PAGE = readFileSync(
  resolve(ROOT, 'apps/frontend/src/app/admin/legal/[type]/page.tsx'),
  'utf8',
);
const CSS = readFileSync(
  resolve(ROOT, 'apps/frontend/src/app/admin/admin-tz.css'),
  'utf8',
);

describe('admin legal WYSIWYG editor', () => {
  test('edits formatted document instead of exposing raw HTML textarea', () => {
    assert.match(PAGE, /contentEditable/);
    assert.match(PAGE, /className="adm-rich-editor__surface"/);
    assert.match(PAGE, /editorRef\.current\.innerHTML/);
    assert.doesNotMatch(PAGE, /adm-textarea--legal/);
    assert.doesNotMatch(PAGE, /Содержимое \(HTML\)/);
  });

  test('keeps HTML as the backend-compatible storage format', () => {
    assert.match(PAGE, /content: draftContent/);
    assert.match(PAGE, /dangerouslySetInnerHTML=\{\{ __html: draftContent \}\}/);
  });

  test('provides Word-like formatting controls', () => {
    assert.match(PAGE, /runEditorCommand\('bold'\)/);
    assert.match(PAGE, /runEditorCommand\('italic'\)/);
    assert.match(PAGE, /runEditorCommand\('underline'\)/);
    assert.match(PAGE, /insertUnorderedList/);
    assert.match(PAGE, /insertOrderedList/);
    assert.match(PAGE, /createLink/);
    assert.match(PAGE, /runEditorCommand\('undo'\)/);
    assert.match(PAGE, /runEditorCommand\('redo'\)/);
  });

  test('styles tables and document text inside the visual surface', () => {
    assert.match(CSS, /\.adm-rich-editor__surface \{/);
    assert.match(CSS, /\.adm-rich-editor__surface table \{/);
    assert.match(CSS, /\.adm-rich-editor__surface th,/);
    assert.match(CSS, /\.adm-rich-editor__toolbar \{/);
  });
});
