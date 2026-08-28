import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const layout = read('apps/frontend/src/app/layout.tsx');
const css = read('apps/frontend/src/app/mobile-390-buttons-hero-fix.css');
const hero = read('apps/frontend/src/components/HeroSection.tsx');

test('mobile header button width fix is loaded after the 390 layout', () => {
  assert.ok(layout.indexOf("mobile-390-buttons-hero-fix.css") > layout.indexOf("mobile-390-final.css"));
  assert.ok(css.includes('max-width: none !important'));
});

test('mobile hero uses uncropped existing artwork with a white blend', () => {
  assert.ok(css.includes('.pub-hero-visual::before'));
  assert.ok(css.includes('linear-gradient('));
  assert.ok(css.includes('object-fit: contain !important'));
  assert.ok(css.includes('.pub-hero-calendar'));
  assert.ok(hero.includes("роста,{' '}"));
});
