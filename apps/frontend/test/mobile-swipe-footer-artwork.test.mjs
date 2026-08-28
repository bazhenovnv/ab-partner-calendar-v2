import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const layout = read('apps/frontend/src/app/layout.tsx');
const banner = read('apps/frontend/src/components/events/MainEventsBanner.tsx');
const carouselCss = read('apps/frontend/src/components/events/main-events-carousel.module.css');
const footer = read('apps/frontend/src/components/layout/SiteFooter.tsx');
const footerCss = read('apps/frontend/src/app/mobile-footer-artwork-final.css');

test('main events keeps a touch-safe horizontal swipe contract', () => {
  assert.ok(banner.includes('SWIPE_THRESHOLD_PX = 44'));
  assert.ok(banner.includes("event.pointerType !== 'mouse'"));
  assert.ok(banner.includes('setPointerCapture(event.pointerId)'));
  assert.ok(banner.includes('delta > 0 ? goPrevious() : goNext()'));
  assert.ok(carouselCss.includes('touch-action: pan-y pinch-zoom'));
  assert.ok(carouselCss.includes('overscroll-behavior-x: contain'));
});

test('mobile footer positions notebook and cup as independent clipped pieces', () => {
  assert.ok(footer.includes('pub-footer-stationery-piece--notebook'));
  assert.ok(footer.includes('pub-footer-stationery-piece--cup'));
  assert.ok(footer.includes('pub-footer-stationery-source--notebook'));
  assert.ok(footer.includes('pub-footer-stationery-source--cup'));
  assert.ok(footerCss.includes('.pub-footer-stationery-piece--notebook'));
  assert.ok(footerCss.includes('.pub-footer-stationery-piece--cup'));
  assert.ok(footerCss.includes('top: 226px !important'));
  assert.ok(footerCss.includes('right: -4px !important'));
});

test('footer artwork correction is the last mobile global override', () => {
  assert.ok(
    layout.indexOf("mobile-footer-artwork-final.css") >
      layout.indexOf("mobile-390-buttons-hero-fix.css"),
  );
});
