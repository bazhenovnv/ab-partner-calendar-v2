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
  test('uses one virtual drum and one movement queue', () => {
    const component = readFileSync(COMPONENT, 'utf8');
    const carouselCardType = component.match(
      /type CarouselCard = \{[\s\S]*?\n\};/,
    )?.[0] ?? '';

    assert.match(component, /const VISIBLE_RADIUS = 2;/);
    assert.match(component, /const BUFFER_RADIUS = VISIBLE_RADIUS \+ 1;/);
    assert.match(carouselCardType, /type CarouselCard = \{/);
    assert.match(component, /movementQueueRef/);
    assert.match(component, /runNextMovementStep/);
    assert.match(component, /hasNextStep \? STEP_INTERVAL_MS : STEP_DURATION_MS/);
    assert.match(component, /moveBy\(card\.offset\)/);

    assert.doesNotMatch(component, /galleryRef/);
    assert.doesNotMatch(component, /deferredCardId/);
    assert.doesNotMatch(component, /CARD_ENTRY_STAGGER_MS/);
    assert.doesNotMatch(component, /CARD_WRAP_INTERVAL_MS/);
    assert.doesNotMatch(component, /--card-border-width/);
    assert.doesNotMatch(component, /styles\.cardActive/);
    assert.doesNotMatch(carouselCardType, /\beventIndex\s*:/);
    assert.doesNotMatch(carouselCardType, /\bvirtualIndex\s*:/);
  });

  test('has no card border and uses one strong visible omnidirectional shadow', () => {
    const styles = readFileSync(STYLES, 'utf8');
    const card = styles.match(/\.card \{[\s\S]*?\n\}/)?.[0] ?? '';
    const frame = styles.match(/\.frame \{[\s\S]*?\n\}/)?.[0] ?? '';

    assert.match(card, /border: 0;/);
    assert.match(card, /border-radius: var\(--card-radius\);/);
    assert.match(
      card,
      /box-shadow:\s*0 0 12px 2px rgba\(0, 0, 0, 0\.44\),\s*0 0 30px 6px rgba\(0, 0, 0, 0\.30\);/,
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
