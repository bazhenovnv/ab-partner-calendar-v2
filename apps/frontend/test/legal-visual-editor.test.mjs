import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const PAGE = readFileSync(
  resolve(FRONTEND, 'src/app/admin/legal/[type]/page.tsx'),
  'utf8',
);
const EDITOR = readFileSync(
  resolve(FRONTEND, 'src/components/admin/LegalRichTextEditor.tsx'),
  'utf8',
);

describe('Legal visual editor', () => {
  test('does not expose raw HTML textarea in the legal document page', () => {
    assert.doesNotMatch(PAGE, /Содержимое \(HTML\)/);
    assert.doesNotMatch(PAGE, /adm-textarea--legal/);
    assert.match(PAGE, /<LegalRichTextEditor value=\{draftContent\} onChange=\{setDraftContent\} \/>/);
  });

  test('keeps HTML as the persistence format behind a contentEditable surface', () => {
    assert.match(EDITOR, /contentEditable/);
    assert.match(EDITOR, /editorRef\.current\?\.innerHTML/);
    assert.match(EDITOR, /onChange\(editorRef\.current\?\.innerHTML/);
  });

  test('provides common word-processor formatting actions', () => {
    assert.match(EDITOR, /'bold'/);
    assert.match(EDITOR, /'italic'/);
    assert.match(EDITOR, /'underline'/);
    assert.match(EDITOR, /'insertUnorderedList'/);
    assert.match(EDITOR, /'insertOrderedList'/);
    assert.match(EDITOR, /'createLink'/);
  });
});
