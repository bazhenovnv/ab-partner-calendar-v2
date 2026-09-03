import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const css = readFileSync(
  resolve(root, 'apps/frontend/src/app/mobile-figma-polish-20260903.css'),
  'utf8',
);

test('main-events direction indicator returns on the real centre dot without a pseudo overlay', () => {
  assert.match(
    css,
    /\[role='group'\]:has\(> button:first-child\[aria-current='true'\]\) > button:nth-child\(2\)/,
  );
  assert.match(
    css,
    /\[role='group'\]:has\(> button:last-child\[aria-current='true'\]\) > button:nth-child\(2\)/,
  );
  assert.match(css, /animation:\s*main-events-center-dot-return 560ms steps\(1, end\) forwards;/);
  assert.match(
    css,
    /@keyframes main-events-center-dot-return\s*\{[\s\S]*?0%, 49\.99% \{ background: #a1a1a1; \}[\s\S]*?50%, 100% \{ background: #515151; \}/,
  );
  assert.match(
    css,
    /@keyframes main-events-side-dot-release\s*\{[\s\S]*?0%, 49\.99% \{ background: #515151; \}[\s\S]*?50%, 100% \{ background: #a1a1a1; \}/,
  );
  assert.doesNotMatch(
    css,
    /nav\[aria-label='Навигация по главным событиям'\] \[role='group'\]::after/,
  );
});
