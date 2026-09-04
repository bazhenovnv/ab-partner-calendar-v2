import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const component = readFileSync(
  resolve(root, 'apps/frontend/src/components/RotatingQuotesBlock.tsx'),
  'utf8',
);

test('rotating quote text uses a slightly bolder medium weight', () => {
  assert.match(
    component,
    /<p className="quotes-text" style=\{\{ fontWeight: 500 \}\}>\{q\.text\}<\/p>/,
  );
  assert.doesNotMatch(component, /quotes-text[^\n]*fontWeight:\s*(600|700|800|900)/);
});
