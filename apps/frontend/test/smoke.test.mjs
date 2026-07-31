/**
 * Frontend smoke tests — route file existence checks.
 * Uses Node.js built-in test runner (node:test), zero extra dependencies.
 * Run: node --test apps/frontend/test/smoke.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const FRONTEND = resolve(import.meta.dirname, '..');
const SRC = join(FRONTEND, 'src');

function app(relPath) {
  return join(SRC, 'app', relPath);
}

function lib(relPath) {
  return join(SRC, relPath);
}

// ── Public routes ─────────────────────────────────────────────────────────────

describe('Public site routes exist', () => {
  const routes = [
    ['home page', 'page.tsx'],
    ['root layout', 'layout.tsx'],
    ['loading state', 'loading.tsx'],
    ['error boundary', 'error.tsx'],
    ['event detail', 'events/[id]/page.tsx'],
    ['legal page', 'legal/[slug]/page.tsx'],
    ['maintenance page', 'maintenance/page.tsx'],
  ];

  for (const [label, path] of routes) {
    test(label, () => {
      assert.ok(existsSync(app(path)), `Missing: src/app/${path}`);
    });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

describe('Admin routes exist', () => {
  const routes = [
    ['admin layout', 'admin/layout.tsx'],
    ['admin dashboard', 'admin/page.tsx'],
    ['admin login', 'admin/login/page.tsx'],
    ['admin events list', 'admin/events/page.tsx'],
    ['admin quotes list', 'admin/quotes/page.tsx'],
    ['admin cities list', 'admin/cities/page.tsx'],
    ['admin directions list', 'admin/directions/page.tsx'],
    ['admin broadcasts list', 'admin/broadcasts/page.tsx'],
    ['admin broadcast detail', 'admin/broadcasts/[id]/page.tsx'],
    ['admin settings', 'admin/settings/page.tsx'],
    ['admin legal', 'admin/legal/[type]/page.tsx'],
  ];

  for (const [label, path] of routes) {
    test(label, () => {
      assert.ok(existsSync(app(path)), `Missing: src/app/${path}`);
    });
  }
});

// ── Key components exist ──────────────────────────────────────────────────────

describe('Key components exist', () => {
  const components = [
    'components/layout/SiteHeader.tsx',
    'components/layout/SiteFooter.tsx',
    'components/events/EventsSection.tsx',
    'components/events/EventDetailActions.tsx',
    'components/MetrikaPageview.tsx',
    'lib/admin-api.ts',
    'lib/metrika.ts',
  ];

  for (const path of components) {
    test(path, () => {
      assert.ok(existsSync(lib(path)), `Missing: src/${path}`);
    });
  }
});

// ── Admin auth guard ──────────────────────────────────────────────────────────

describe('Admin auth guard', () => {
  test('AdminLayoutClient redirects unauthenticated to /admin/login', () => {
    const content = readFileSync(app('admin/AdminLayoutClient.tsx'), 'utf8');
    assert.ok(content.includes('/admin/login'), 'Missing /admin/login redirect');
    assert.ok(
      content.includes('token') || content.includes('auth'),
      'Missing auth check in AdminLayoutClient',
    );
  });
});

// ── Pinned production homepage ──────────────────────────────────────────────

describe('Pinned production homepage', () => {
  test('hero keeps the vase photo and desk calendar as separate tracked layers', () => {
    const content = readFileSync(lib('components/HeroSection.tsx'), 'utf8');

    assert.ok(
      existsSync(join(FRONTEND, 'public', 'hero', 'hero-vase-books.png')),
      'Missing the tracked vase and books hero layer',
    );
    assert.ok(
      existsSync(join(FRONTEND, 'public', 'hero', 'hero-desk-calendar.png')),
      'Missing the tracked desk calendar hero layer',
    );
    assert.match(content, /src="\/hero\/hero-vase-books\.png"/);
    assert.match(content, /src="\/hero\/hero-desk-calendar\.png"/);
    assert.match(content, /className="pub-hero-books"/);
    assert.match(content, /className="pub-hero-calendar"/);
    assert.doesNotMatch(content, /src="\/hero-composition\.png"/);
    assert.doesNotMatch(content, /approved\.png/);
  });

  test('header action icons use tracked local components and assets', () => {
    const content = readFileSync(lib('components/layout/SiteHeader.tsx'), 'utf8');

    assert.match(content, /function TelegramIcon\(\)/);
    assert.match(content, /function MaxIcon\(\)/);
    assert.match(content, /function PartnerIcon\(\)/);
    assert.match(content, /max-header-icon\.png/);
    assert.match(content, /pub-header-action-icon-wrap--max/);
    assert.ok(
      existsSync(join(FRONTEND, 'public', 'ui-icons', 'header', 'max-header-icon.png')),
      'Missing tracked MAX header icon',
    );
    assert.match(content, /className="pub-header-inner/);
    assert.doesNotMatch(content, /approved\.png/);
  });

  test('approved July 29 visual layer is loaded', () => {
    const content = readFileSync(app('layout.tsx'), 'utf8');

    assert.match(content, /stage77-final-figma-polish\.css/);
    assert.match(content, /filter-calendar-figma\.css/);
    assert.doesNotMatch(content, /stage76-figma-interactions\.css/);
  });

  test('region, city and direction filters support visible multi-selection', () => {
    const filters = readFileSync(lib('components/events/EventFilters.tsx'), 'utf8');
    const section = readFileSync(lib('components/events/EventsSection.tsx'), 'utf8');

    assert.match(filters, /regions: string\[\]/);
    assert.match(filters, /cities: string\[\]/);
    assert.match(filters, /aria-label="Выберите регионы или города"/);
    assert.match(filters, /aria-label="Выберите одно или несколько направлений"/);
    assert.match(filters, /selectedLabels\.join\(', '\)/);
    assert.match(filters, /\.join\(', '\)/);
    assert.match(section, /qs\.append\('regions', region\)/);
    assert.match(section, /qs\.append\('cities', city\)/);
    assert.match(section, /qs\.append\('directions', direction\)/);
  });

  test('applied filters are forwarded to calendar markers', () => {
    const section = readFileSync(lib('components/events/EventsSection.tsx'), 'utf8');
    const calendar = readFileSync(lib('components/events/EventCalendar.tsx'), 'utf8');

    assert.match(section, /<EventCalendar[\s\S]*filters=\{filters\}/);
    assert.match(calendar, /filters\.regions\.forEach/);
    assert.match(calendar, /filters\.cities\.forEach/);
    assert.match(calendar, /filters\.directions\.forEach/);
    assert.match(calendar, /public\/calendar\?year=/);
  });

  test('filter and calendar use the measured Figma geometry', () => {
    const styles = readFileSync(app('filter-calendar-figma.css'), 'utf8');

    assert.match(styles, /width: 588px !important/);
    assert.match(styles, /height: 632px !important/);
    assert.match(styles, /width: 760\.866px !important/);
    assert.match(styles, /height: 631\.824px !important/);
    assert.match(styles, /gap: 41\.36px !important/);
    assert.match(styles, /font-size: 21px !important/);
    assert.match(styles, /font-size: 30px !important/);
  });

  test('quote people use the original uncompressed Figma assets and dimensions', () => {
    const component = readFileSync(lib('components/RotatingQuotesBlock.tsx'), 'utf8');
    const layout = readFileSync(app('layout.tsx'), 'utf8');
    const styles = readFileSync(app('quote-people-figma-final.css'), 'utf8');
    const leftImage = readFileSync(join(FRONTEND, 'public', 'quote-person-left.png'));
    const rightImage = readFileSync(join(FRONTEND, 'public', 'quote-person-right.png'));

    assert.deepEqual(
      { width: leftImage.readUInt32BE(16), height: leftImage.readUInt32BE(20) },
      { width: 302, height: 362 },
    );
    assert.deepEqual(
      { width: rightImage.readUInt32BE(16), height: rightImage.readUInt32BE(20) },
      { width: 287, height: 359 },
    );
    assert.match(component, /width=\{302\}[\s\S]*height=\{362\}[\s\S]*unoptimized/);
    assert.match(component, /width=\{287\}[\s\S]*height=\{359\}[\s\S]*unoptimized/);
    assert.match(layout, /quote-people-figma-final\.css/);
    assert.match(styles, /\.quotes-person-left[\s\S]*width: 302px !important[\s\S]*height: 362px !important/);
    assert.match(styles, /\.quotes-person-right[\s\S]*width: 287px !important[\s\S]*height: 359px !important/);
  });

  test('footer uses the measured Figma brand, grid and contact icon geometry', () => {
    const component = readFileSync(lib('components/layout/SiteFooter.tsx'), 'utf8');
    const layout = readFileSync(app('layout.tsx'), 'utf8');
    const styles = readFileSync(app('footer-figma-final.css'), 'utf8');

    assert.match(component, /width=\{101\}[\s\S]*height=\{69\}[\s\S]*unoptimized[\s\S]*pub-footer-logo-mark/);
    assert.match(component, /pub-footer-contact-icon--phone/);
    assert.match(component, /pub-footer-contact-icon--email/);
    assert.match(component, /pub-footer-contact-icon--location/);
    assert.match(layout, /footer-figma-final\.css/);
    assert.match(styles, /width: 1496px !important/);
    assert.match(styles, /grid-template-columns: 376px 230px 411px 479px !important/);
    assert.match(styles, /width: 101\.29px !important/);
    assert.match(styles, /font-size: 25\.76px !important/);
    assert.match(styles, /padding: 96px 0 0 57px !important/);
    assert.match(styles, /height: 251px/);
    assert.match(styles, /width: 32\.74px !important/);
    assert.match(styles, /width: 30px !important[\s\S]*height: 29px !important/);
    assert.match(styles, /width: 21\.15px !important[\s\S]*height: 27\.02px !important/);
  });

  test('canonical legal documents remain the frontend fallback', () => {
    const content = readFileSync(lib('lib/legal.ts'), 'utf8');

    assert.match(content, /LEGAL_DOCUMENTS/);
  });
});
