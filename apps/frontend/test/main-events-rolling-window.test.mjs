import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const BRIDGE = read('apps/frontend/src/components/events/MainEventsCarouselBridge.tsx');
const BANNER = read('apps/frontend/src/components/events/MainEventsBanner.tsx');

function rotateForBanner(source) {
  return [...source.slice(2), ...source.slice(0, 2)];
}

function windowAt(rotated, position) {
  const total = rotated.length;
  return [-2, -1, 0, 1, 2].map((offset) => {
    const index = ((position + offset) % total + total) % total;
    return rotated[index];
  });
}

describe('Main events five-card rolling window', () => {
  test('starts with source events 1..5 and introduces one unseen event per next step', () => {
    const source = [1, 2, 3, 4, 5, 6, 7];
    const rotated = rotateForBanner(source);

    assert.deepEqual(windowAt(rotated, 0), [1, 2, 3, 4, 5]);
    assert.deepEqual(windowAt(rotated, 1), [2, 3, 4, 5, 6]);
    assert.deepEqual(windowAt(rotated, 2), [3, 4, 5, 6, 7]);
    assert.deepEqual(windowAt(rotated, 3), [4, 5, 6, 7, 1]);
    assert.deepEqual(windowAt(rotated, 4), [5, 6, 7, 1, 2]);
    assert.deepEqual(windowAt(rotated, 7), [1, 2, 3, 4, 5]);
  });

  test('binds that sequence to the production bridge and banner formulas', () => {
    assert.match(BRIDGE, /const MAIN_EVENTS_WINDOW_SIZE = 5;/);
    assert.match(BRIDGE, /const MAIN_EVENTS_VISIBLE_RADIUS = 2;/);
    assert.match(BRIDGE, /events\.slice\(MAIN_EVENTS_VISIBLE_RADIUS\)/);
    assert.match(BRIDGE, /events\.slice\(0, MAIN_EVENTS_VISIBLE_RADIUS\)/);
    assert.match(BRIDGE, /alignFirstRollingWindow\(canonicalEvents\)/);

    assert.match(BANNER, /const VISIBLE_RADIUS = 2;/);
    assert.match(BANNER, /const virtualIndex = position \+ offset;/);
    assert.match(BANNER, /carouselEvents\[normalizeIndex\(virtualIndex, total\)\]/);
    assert.match(BANNER, /visible: Math\.abs\(offset\) <= VISIBLE_RADIUS/);
    assert.match(BANNER, /moveBy\(1\)/);
  });
});
