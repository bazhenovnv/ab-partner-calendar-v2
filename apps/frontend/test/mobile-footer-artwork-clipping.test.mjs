import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const footer = read('apps/frontend/src/components/layout/SiteFooter.tsx');
const artwork = read('apps/frontend/src/app/mobile-footer-artwork-final.css');
const tuning = read('apps/frontend/src/app/mobile-figma-final-tuning.css');

test('mobile footer keeps notebook and plant as a separate clipped artwork view', () => {
  assert.match(footer, /pub-footer-stationery-piece--notebook/);
  assert.match(footer, /pub-footer-stationery-piece--cup/);
  assert.match(artwork, /\.pub-footer-stationery-piece\s*\{[\s\S]*?overflow:\s*hidden\s*!important/);
});

test('final mobile crop keeps the notebook and lower leaves inside the viewport', () => {
  assert.match(tuning, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*14px\s*!important/);
  assert.match(tuning, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?width:\s*136px\s*!important/);
  assert.match(tuning, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?height:\s*186px\s*!important/);
  assert.match(tuning, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?width:\s*180px\s*!important/);
  assert.match(tuning, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?left:\s*-10px\s*!important/);
  assert.match(tuning, /\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?right:\s*10px\s*!important/);
});

test('narrow mobile tuning never pushes the footer artwork beyond the right edge', () => {
  assert.match(tuning, /@media \(max-width: 350px\)[\s\S]*?\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*8px\s*!important/);
  assert.match(tuning, /@media \(max-width: 350px\)[\s\S]*?\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?right:\s*7px\s*!important/);
});
