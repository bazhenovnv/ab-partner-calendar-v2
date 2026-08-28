import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const LAYOUT = read('apps/frontend/src/app/layout.tsx');
const MOBILE = read('apps/frontend/src/app/mobile-390-final.css');
const EVENTS_SECTION = read('apps/frontend/src/components/events/EventsSection.tsx');
const RESPONSIVE_FILTER = read('apps/frontend/src/components/events/ResponsiveEventFilters.tsx');
const EVENT_CARD = read('apps/frontend/src/components/events/events-runtime.module.css');

describe('Approved 390 px homepage layout', () => {
  test('loads the isolated mobile override after the legacy/final CSS stack', () => {
    const mobileImport = LAYOUT.indexOf("import './mobile-390-final.css';");
    const previousFinalImport = LAYOUT.indexOf("import './modal-close-spacing-scroll-final.css';");

    assert.ok(mobileImport > previousFinalImport);
  });

  test('keeps the supplied hero artwork visible and separates the mobile event shell', () => {
    assert.match(MOBILE, /@media \(max-width: 767px\)/);
    assert.match(MOBILE, /\.pub-hero-visual\s*\{[\s\S]*?display:\s*block !important;/);
    assert.match(MOBILE, /\.pub-events-outer\s*\{[\s\S]*?background:\s*transparent !important;/);
    assert.match(MOBILE, /\.pub-events-calendar-col\s*\{[\s\S]*?background:\s*#fff !important;/);
  });

  test('uses an accessible collapsed mobile filter without changing filter semantics', () => {
    assert.match(EVENTS_SECTION, /ResponsiveEventFilters/);
    assert.match(RESPONSIVE_FILTER, /aria-expanded=\{isOpen\}/);
    assert.match(RESPONSIVE_FILTER, /aria-controls=\{panelId\}/);
    assert.match(RESPONSIVE_FILTER, /setIsOpen\(false\)/);
    assert.match(MOBILE, /\.pub-filter-mobile-panel\s*\{\s*display:\s*none !important;/);
    assert.match(MOBILE, /\.pub-filter-mobile-panel--open\s*\{\s*display:\s*block !important;/);
  });

  test('restores quote people and footer artwork from the mobile sketch', () => {
    assert.match(MOBILE, /\.quotes-person\s*\{[\s\S]*?display:\s*block !important;/);
    assert.match(MOBILE, /\.pub-footer-stationery\s*\{[\s\S]*?display:\s*block !important;/);
  });

  test('preserves the released long Russian month date badge contract', () => {
    assert.match(EVENT_CARD, /\.dateBadge\s*\{[\s\S]*?width:\s*88px;/);
    assert.match(EVENT_CARD, /\.dateMonth\s*\{[\s\S]*?white-space:\s*nowrap;/);
    assert.match(EVENT_CARD, /@media \(max-width: 767px\)[\s\S]*?\.dateBadge\s*\{[\s\S]*?width:\s*76px;/);
    assert.match(MOBILE, /\[data-event-card-date\][\s\S]*?width:\s*76px !important;/);
  });
});
