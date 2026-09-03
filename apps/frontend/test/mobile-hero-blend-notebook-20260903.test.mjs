import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const css = readFileSync(
  resolve(root, 'apps/frontend/src/app/mobile-figma-polish-20260903.css'),
  'utf8',
);

test('mobile hero fades the approved artwork into the white panel below the copy', () => {
  assert.match(css, /\.pub-hero-panel\s*\{[\s\S]*?background:\s*#fff !important;/);
  assert.match(css, /\.pub-hero-mobile-figma-art\s*\{[\s\S]*?-webkit-mask-image:\s*linear-gradient\(/);
  assert.match(css, /\.pub-hero-mobile-figma-art\s*\{[\s\S]*?mask-image:\s*linear-gradient\(/);
  assert.match(css, /transparent 0%/);
  assert.match(css, /#000 40%/);
  assert.match(css, /\.pub-hero-content\s*\{[\s\S]*?position:\s*relative !important;[\s\S]*?z-index:\s*3 !important;/);
});

test('mobile footer keeps the notebook enlarged, raises it and shifts it farther right', () => {
  const standardNotebookBlock = css.match(
    /@media \(max-width: 767px\)[\s\S]*?\.pub-footer-stationery-piece--notebook\s*\{([^}]*)\}/,
  )?.[1] ?? '';
  const narrowNotebookBlock = css.match(
    /@media \(max-width: 350px\)[\s\S]*?\.pub-footer-stationery-piece--notebook\s*\{([^}]*)\}/,
  )?.[1] ?? '';

  assert.match(standardNotebookBlock, /top:\s*-8px !important;/);
  assert.match(standardNotebookBlock, /right:\s*-6px !important;/);
  assert.match(standardNotebookBlock, /width:\s*146px !important;/);
  assert.match(standardNotebookBlock, /height:\s*206px !important;/);
  assert.match(standardNotebookBlock, /transform:\s*translateX\(4px\) scale\(1\) !important;/);
  assert.match(css, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?width:\s*202px !important;/);

  assert.match(narrowNotebookBlock, /top:\s*-4px !important;/);
  assert.match(narrowNotebookBlock, /right:\s*-3px !important;/);
  assert.match(narrowNotebookBlock, /transform:\s*translateX\(3px\) scale\(0\.94\) !important;/);
  assert.doesNotMatch(css, /\.pub-footer-stationery-piece--cup\s*\{/);
});
