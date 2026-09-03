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

test('moves the contacts divider left and optically levels the contacts column', () => {
  assert.match(css, /grid-template-columns:\s*112px minmax\(0, 1fr\) !important;/);
  assert.match(css, /column-gap:\s*10px !important;/);
  assert.match(css, /nth-child\(3\)[\s\S]*?padding-left:\s*12px !important;/);
  assert.match(polish, /nth-child\(3\)[\s\S]*?top:\s*-2px !important;/);
  assert.match(polish, /nth-child\(3\)[\s\S]*?padding-top:\s*0 !important;/);
});

test('slightly reduces mobile calendar geometry so the right edge stays visible', () => {
  assert.match(css, /\.pub-events-calendar-col\s*\{[\s\S]*?width:\s*calc\(100% - 8px\) !important;/);
  assert.match(css, /\.pub-calendar\s*\{[\s\S]*?width:\s*calc\(100% - 4px\) !important;/);
  assert.match(css, /\.pub-calendar-table\s*\{[\s\S]*?min-height:\s*292px !important;/);
});

test('keeps the quote band white while returning the people area to grey with symmetric shadow', () => {
  assert.match(css, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?height:\s*352px !important;/);
  assert.match(css, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?min-height:\s*352px !important;/);
  assert.match(polish, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?background:\s*#f1f1f1 !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?height:\s*130px !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?bottom:\s*8px !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?background:\s*#fff !important;/);
  assert.match(polish, /\.quotes-layout::after\s*\{[\s\S]*?box-shadow:\s*0 0 10px rgba\(13, 35, 68, 0\.12\) !important;/);
  assert.match(polish, /\.quotes-section\s*\{[\s\S]*?box-shadow:\s*none !important;/);
});

test('lowers the footer title slightly and enlarges the notebook safely', () => {
  assert.match(polish, /\.pub-footer-logo-text\s*\{[\s\S]*?top:\s*4px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?right:\s*2px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?width:\s*134px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?height:\s*190px !important;/);
  assert.match(polish, /\.pub-footer-stationery-piece--notebook\s*\{[\s\S]*?scale\(0\.92\)/);
  assert.match(polish, /\.pub-footer-stationery-source--notebook\s*\{[\s\S]*?width:\s*185px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?right:\s*10px !important;/);
  assert.match(css, /\.pub-footer-stationery-piece--cup\s*\{[\s\S]*?scale\(0\.88\)/);
});
