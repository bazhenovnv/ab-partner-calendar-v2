import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const layout = read('apps/frontend/src/app/layout.tsx');
const css = read('apps/frontend/src/app/mobile-390-buttons-hero-fix.css');
const polish = read('apps/frontend/src/app/mobile-quotes-footer-polish.css');
const hero = read('apps/frontend/src/components/HeroSection.tsx');

test('mobile header button width fix is loaded after the 390 layout', () => {
  assert.ok(layout.indexOf("mobile-390-buttons-hero-fix.css") > layout.indexOf("mobile-390-final.css"));
  assert.ok(css.includes('max-width: none !important'));
});

test('mobile hero replaces the split desktop artwork with the approved Figma image', () => {
  assert.ok(hero.includes('hero-mobile-figma-20260903.webp'));
  assert.ok(hero.includes('className="pub-hero-mobile-figma"'));
  assert.match(polish, /\.pub-hero-books,[\s\S]*?\.pub-hero-calendar\s*\{[\s\S]*?display:\s*none !important;/);
  assert.match(polish, /\.pub-hero-mobile-figma\s*\{[\s\S]*?display:\s*block !important;/);
  assert.match(polish, /\.pub-hero-mobile-figma\s*\{[\s\S]*?width:\s*100% !important;/);
  assert.match(polish, /\.pub-hero-mobile-figma\s*\{[\s\S]*?object-fit:\s*contain !important;/);
  assert.match(polish, /\.pub-hero-visual::before\s*\{[\s\S]*?display:\s*none !important;/);
  assert.ok(hero.includes("роста,{' '}"));
});
