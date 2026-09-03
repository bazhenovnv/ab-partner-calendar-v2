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
  assert.match(css, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?top:\s*-8px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*-10px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?width:\s*146px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?height:\s*206px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?scale\(1\)/);
  assert.match(css, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?width:\s*202px !important;/);
  assert.match(css, /@media \(max-width: 350px\)[\s\S]*?\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?top:\s*-4px !important;/);
  assert.match(css, /@media \(max-width: 350px\)[\s\S]*?\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*-6px !important;/);
  assert.doesNotMatch(css, /\.pub-footer-stationery-piece--cup\s*\{/);
});
