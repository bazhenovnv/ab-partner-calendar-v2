import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const bridge = read('apps/frontend/src/components/events/MainEventsCarouselBridge.tsx');
const carousel = read('apps/frontend/src/components/events/MainEventsBanner.tsx');
const styles = read('apps/frontend/src/components/events/main-events-carousel.module.css');

test('uses an iOS-specific touch path with a shorter deliberate swipe threshold', () => {
  assert.match(bridge, /const IOS_SWIPE_THRESHOLD_PX = 28;/);
  assert.match(bridge, /const IOS_AXIS_LOCK_PX = 7;/);
  assert.match(bridge, /iPad\|iPhone\|iPod/);
  assert.match(bridge, /navigator\.platform === 'MacIntel'/);
  assert.match(bridge, /navigator\.maxTouchPoints > 1/);
  assert.match(bridge, /touchmove/);
  assert.match(bridge, /passive: false/);
  assert.match(bridge, /event\.preventDefault\(\)/);
});

test('locks direction before consuming the gesture so vertical page scrolling remains available', () => {
  assert.match(bridge, /Math\.max\(Math\.abs\(deltaX\), Math\.abs\(deltaY\)\) < IOS_AXIS_LOCK_PX/);
  assert.match(bridge, /Math\.abs\(deltaX\) > Math\.abs\(deltaY\)/);
  assert.match(bridge, /axis = Math\.abs\(deltaX\) > Math\.abs\(deltaY\) \? 'horizontal' : 'vertical'/);
  assert.match(bridge, /if \(axis === 'horizontal'\)/);
});

test('disables the legacy touch-pointer stream only on iOS and reuses carousel keyboard movement', () => {
  assert.match(bridge, /event\.pointerType === 'touch'/);
  assert.match(bridge, /event\.stopPropagation\(\)/);
  assert.match(bridge, /new KeyboardEvent\('keydown'/);
  assert.match(bridge, /deltaX > 0 \? 'ArrowLeft' : 'ArrowRight'/);
  assert.match(carousel, /if \(event\.key === 'ArrowLeft'\)/);
  assert.match(carousel, /if \(event\.key === 'ArrowRight'\)/);
});

test('keeps the swipe target on the full carousel gallery and preserves vertical browser gestures', () => {
  assert.match(bridge, /#main-events \[aria-roledescription="карусель"\]/);
  assert.match(styles, /\.gallery\s*\{[\s\S]*?touch-action:\s*pan-y pinch-zoom;/);
  assert.match(bridge, /--drag-offset/);
  assert.match(bridge, /--card-motion-duration/);
});

test('suppresses accidental card clicks after an iOS horizontal swipe', () => {
  assert.match(bridge, /IOS_CLICK_SUPPRESS_MS = 450/);
  assert.match(bridge, /suppressClickUntil = performance\.now\(\) \+ IOS_CLICK_SUPPRESS_MS/);
  assert.match(bridge, /gallery\.addEventListener\('click', suppressSwipeClick, true\)/);
});
