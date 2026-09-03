import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const layout = read('apps/frontend/src/app/layout.tsx');
const css = read('apps/frontend/src/app/mobile-figma-final-tuning.css');
const polish = read('apps/frontend/src/app/mobile-quotes-footer-polish.css');

test('loads the mobile polish after all previous mobile correction layers', () => {
  assert.ok(layout.indexOf('mobile-figma-final-tuning.css') > layout.indexOf('mobile-footer-artwork-final.css'));
  assert.ok(layout.indexOf('mobile-quotes-footer-polish.css') > layout.indexOf('mobile-figma-final-tuning.css'));
});

test('moves the contacts divider left and levels the contacts column with projects', () => {
  assert.match(css, /grid-template-columns:\s*112px minmax\(0, 1fr\) !important;/);
  assert.match(css, /column-gap:\s*10px !important;/);
  assert.match(css, /nth-child\(3\)[\s\S]*?padding-left:\s*12px !important;/);
  assert.match(polish, /nth-child\(3\)[\s\S]*?top:\s*0 !important;/);
  assert.match(polish, /nth-child\(3\)[\s\S]*?padding-top:\s*0 !important;/);
  assert.match(polish, /\.pub-footer-contact-icon--phone\s*\{[\s\S]*?scale\(1\.16\)/);
});

test('slightly reduces mobile calendar geometry so the right edge stays visible', () => {
  assert.match(css, /\.pub-events-calendar-col\s*\{[\s\S]*?width:\s*calc\(100% - 8px\) !important;/);
  assert.match(css, /\.pub-calendar\s*\{[\s\S]*?width:\s*calc\(100% - 4px\) !important;/);
  assert.match(css, /\.pub-calendar-table\s*\{[\s\S]*?min-height:\s*292px !important;/);
});

test('keeps hero, calendar and quotes visually static on mobile taps', () => {
  assert.match(polish, /\.pub-hero-panel,[\s\S]*?\.pub-events-calendar-col,[\s\S]*?\.pub-main-quotes-inner[\s\S]*?transition:\s*none !important;/);
  assert.match(polish, /\.pub-hero-panel:hover,[\s\S]*?\.pub-hero-panel:active,[\s\S]*?transform:\s*none !important;/);
  assert.match(polish, /\.pub-events-calendar-col:hover,[\s\S]*?\.pub-events-calendar-col:active,[\s\S]*?transform:\s*none !important;/);
  assert.match(polish, /-webkit-tap-highlight-color:\s*transparent !important;/);
});

test('layers the darker white quote band over corner-locked people', () => {
  assert.match(css, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?height:\s*352px !important;/);
  assert.match(css, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?min-height:\s*352px !important;/);
  assert.match(polish, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?background:\s*#f1f1f1 !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?height:\s*114px !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?bottom:\s*8px !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?z-index:\s*2 !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?background:\s*#fff !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?box-shadow:\s*0 0 12px rgba\(13, 35, 68, 0\.24\) !important;/);
  assert.match(polish, /\.quotes-person\s*\{[\s\S]*?z-index:\s*1 !important;/);
  assert.match(polish, /\.quotes-person-left\s*\{[\s\S]*?left:\s*0 !important;/);
  assert.match(polish, /\.quotes-person-right\s*\{[\s\S]*?right:\s*0 !important;/);
  assert.match(polish, /\.quotes-card--approved-frame\s*\{[\s\S]*?z-index:\s*3 !important;/);
});

test('aligns the footer brand left and keeps the enlarged notebook safely inside the viewport', () => {
  assert.match(polish, /\.pub-header-brand-title\s*\{[\s\S]*?top:\s*4px !important;/);
  assert.match(polish, /\.pub-footer-logo\s*\{[\s\S]*?left:\s*-4px !important;/);
  assert.match(polish, /\.pub-footer-logo-text\s*\{[\s\S]*?top:\s*7px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*0 !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?width:\s*138px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?height:\s*196px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?scale\(0\.96\)/);
  assert.match(polish, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?width:\s*190px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?right:\s*10px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?scale\(0\.88\)/);
});
