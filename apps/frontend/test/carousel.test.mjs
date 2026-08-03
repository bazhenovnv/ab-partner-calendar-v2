import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const COMPONENT = join(
  FRONTEND,
  'src/components/events/MainEventsBanner.tsx',
);
const STYLES = join(
  FRONTEND,
  'src/components/events/main-events-carousel.module.css',
);

describe('Main events carousel', () => {
  test('uses one virtual drum and one continuous direct movement', () => {
    const component = readFileSync(COMPONENT, 'utf8');
    const carouselCardType = component.match(
      /type CarouselCard = \{[\s\S]*?\n\};/,
    )?.[0] ?? '';

    assert.match(component, /const VISIBLE_RADIUS = 2;/);
    assert.match(component, /const MAX_ANIMATED_STEPS = 2;/);
    assert.match(
      component,
      /const BUFFER_RADIUS = VISIBLE_RADIUS \+ MAX_ANIMATED_STEPS;/,
    );
    assert.match(carouselCardType, /type CarouselCard = \{/);
    assert.match(component, /function getMotionDuration\(movement: number\)/);
    assert.match(
      component,
      /STEP_DURATION_MS \+ STEP_INTERVAL_MS \* Math\.max\(0, steps - 1\)/,
    );
    assert.match(component, /const nextPosition = positionRef\.current \+ normalizedMovement;/);
    assert.match(component, /setMotionDurationMs\(duration\);/);
    assert.match(component, /setPosition\(nextPosition\);/);
    assert.match(component, /moveBy\(card\.offset\)/);
    assert.match(component, /--card-motion-duration/);

    assert.doesNotMatch(component, /movementQueueRef/);
    assert.doesNotMatch(component, /runNextMovementStep/);
    assert.doesNotMatch(component, /galleryRef/);
    assert.doesNotMatch(component, /deferredCardId/);
    assert.doesNotMatch(component, /CARD_ENTRY_STAGGER_MS/);
    assert.doesNotMatch(component, /CARD_WRAP_INTERVAL_MS/);
    assert.doesNotMatch(component, /--card-border-width/);
    assert.doesNotMatch(component, /styles\.cardActive/);
    assert.doesNotMatch(carouselCardType, /\beventIndex\s*:/);
    assert.doesNotMatch(carouselCardType, /\bvirtualIndex\s*:/);
  });

  test('has no card border and uses one dense omnidirectional shadow', () => {
    const styles = readFileSync(STYLES, 'utf8');
    const card = styles.match(/\.card \{[\s\S]*?\n\}/)?.[0] ?? '';
    const frame = styles.match(/\.frame \{[\s\S]*?\n\}/)?.[0] ?? '';

    assert.match(card, /border: 0;/);
    assert.match(card, /border-radius: var\(--card-radius\);/);
    assert.match(
      card,
      /box-shadow:\s*0 0 10px 3px rgba\(0, 0, 0, 0\.62\),\s*0 0 26px 8px rgba\(0, 0, 0, 0\.44\),\s*0 0 46px 14px rgba\(0, 0, 0, 0\.26\);/,
    );

    assert.match(frame, /border: 0;/);
    assert.match(frame, /clip-path: inset\(0 round var\(--card-radius\)\);/);
    assert.doesNotMatch(frame, /box-shadow:/);

    assert.doesNotMatch(styles, /--card-border-width/);
    assert.doesNotMatch(styles, /border-width/);
    assert.doesNotMatch(styles, /\.cardActive/);
    assert.doesNotMatch(styles, /\.card:hover \.frame/);
  });
});
