import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const layout = read('apps/frontend/src/app/layout.tsx');
const css = read('apps/frontend/src/app/mobile-figma-final-tuning.css');

test('loads the final Figma mobile tuning after prior mobile correction layers', () => {
  assert.ok(layout.indexOf('mobile-figma-final-tuning.css') > layout.indexOf('mobile-footer-artwork-final.css'));
});

test('moves the contacts divider left to reserve room for the cup', () => {
  assert.match(css, /grid-template-columns:\s*112px minmax\(0, 1fr\) !important;/);
  assert.match(css, /column-gap:\s*10px !important;/);
  assert.match(css, /nth-child\(3\)[\s\S]*?padding-left:\s*12px !important;/);
});

test('slightly reduces mobile calendar geometry so the right edge stays visible', () => {
  assert.match(css, /\.pub-events-calendar-col\s*\{[\s\S]*?width:\s*calc\(100% - 8px\) !important;/);
  assert.match(css, /\.pub-calendar\s*\{[\s\S]*?width:\s*calc\(100% - 4px\) !important;/);
  assert.match(css, /\.pub-calendar-table\s*\{[\s\S]*?min-height:\s*292px !important;/);
});

test('restores the white Figma background behind the mobile quotes', () => {
  assert.match(css, /\.quotes-section,[\s\S]*?\.quotes-layout\s*\{[\s\S]*?background:\s*#fff !important;/);
});
