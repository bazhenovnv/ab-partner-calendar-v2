import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const MODAL = join(
  FRONTEND,
  'src/components/events/EventModalProvider.tsx',
);
const MODAL_CONTENT = join(
  FRONTEND,
  'src/lib/event-modal-content.ts',
);
const EVENT_CARD = join(
  FRONTEND,
  'src/components/events/EventCard.tsx',
);

describe('Event modal content', () => {
  test('uses one dedicated cleanup module without legacy inline sanitizer', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /cleanEventModalDescription/);
    assert.match(modal, /getEventModalImageUrl/);
    assert.doesNotMatch(modal, /function sanitizeDescription/);
    assert.match(
      modal,
      /cleanEventModalDescription\(event\.shortDescription, event\)/,
    );
    assert.match(
      modal,
      /cleanEventModalDescription\(event\.fullDescription, event\)/,
    );
  });

  test('renders the selected source in a cropped 1280 by 1280 square', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /width=\{1280\}/);
    assert.match(modal, /height=\{1280\}/);
    assert.match(modal, /objectFit: 'cover'/);
    assert.match(modal, /objectPosition: 'center'/);
  });

  test('prefers original artwork for regular events and prepared artwork for main events', () => {
    const content = readFileSync(MODAL_CONTENT, 'utf8');
    const imageSelector = content.match(
      /export function getEventModalImageUrl[\s\S]*$/,
    )?.[0] ?? '';

    assert.match(imageSelector, /if \(event\.mainEvent\)/);
    assert.match(
      imageSelector,
      /image\.modalUrl \?\?[\s\S]*image\.mainEventUrl \?\?[\s\S]*image\.originalUrl/,
    );
    assert.match(
      imageSelector,
      /return \([\s\S]*image\.originalUrl \?\?[\s\S]*image\.modalUrl/,
    );
  });

  test('filters title speaker time and other structured metadata duplicates', () => {
    const content = readFileSync(MODAL_CONTENT, 'utf8');

    assert.match(content, /text === title/);
    assert.match(content, /text === `спикер \$\{speaker\}`/);
    assert.match(content, /candidateTime === eventTime/);
    assert.match(content, /время\(\?:\\s\+проведения\)\?/);
    assert.match(content, /removeRepeatedBlocks/);
    assert.match(content, /removeRepeatedPlainLines/);
    assert.match(content, /removeRepeatedBreakSegments/);
  });

  test('does not render speaker inside compact event cards', () => {
    const card = readFileSync(EVENT_CARD, 'utf8');

    assert.doesNotMatch(card, /event\.speaker/);
    assert.doesNotMatch(card, /Спикер:/);
  });
});
