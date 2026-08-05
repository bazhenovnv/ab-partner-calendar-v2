import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const BRIDGE = readFileSync(
  resolve(FRONTEND, 'src/components/events/MainEventsCarouselBridge.tsx'),
  'utf8',
);
const PAGE = readFileSync(resolve(FRONTEND, 'src/app/page.tsx'), 'utf8');
const BANNER = readFileSync(
  resolve(FRONTEND, 'src/components/events/MainEventsBanner.tsx'),
  'utf8',
);

describe('Main-events ingestion boundary', () => {
  test('uses the backend main-event selection on the production page', () => {
    assert.match(PAGE, /MainEventsCarouselBridge/);
    assert.match(PAGE, /<MainEventsCarouselBridge events=\{main\} \/>/);
  });

  test('bridges legacy source-marker filtering without changing persisted events', () => {
    assert.match(BRIDGE, /events\.map/);
    assert.match(BRIDGE, /event\.mainEvent/);
    assert.match(BRIDGE, /#хит/);
    assert.match(BRIDGE, /<MainEventsBanner events=\{canonicalEvents\} \/>/);
  });

  test('documents the legacy duplicate filter that the bridge neutralizes', () => {
    assert.match(BANNER, /event\.mainEvent && hasHitMarker\(event\)/);
  });
});
