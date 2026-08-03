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
const EVENT_INTERACTIONS = join(
  FRONTEND,
  'src/components/events/event-interactions.module.css',
);
const FORMAT = join(FRONTEND, 'src/lib/format.ts');

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

    assert.match(
      content,
      /withoutTerminalPunctuation\(text\) === withoutTerminalPunctuation\(title\)/,
    );
    assert.match(content, /text === `спикер \$\{speaker\}`/);
    assert.match(content, /timePattern\.test\(candidateTime\)/);
    assert.ok(content.includes('время(?:\\\\s+проведения)?'));
    assert.match(content, /\^\(\?:онлайн\|офлайн\|бесплатно\|платно\)\$/);
    assert.match(content, /\.replace\(\/\\\*\\\*\|__\|~~\/g, ''\)/);
    assert.match(content, /removeRepeatedBlocks/);
    assert.match(content, /removeRepeatedPlainLines/);
    assert.match(content, /removeRepeatedBreakSegments/);
  });

  test('does not render speaker or retain obsolete modal styles in compact event cards', () => {
    const modal = readFileSync(MODAL, 'utf8');
    const card = readFileSync(EVENT_CARD, 'utf8');
    const interactions = readFileSync(EVENT_INTERACTIONS, 'utf8');

    assert.doesNotMatch(card, /event\.speaker/);
    assert.doesNotMatch(card, /Спикер:/);
    assert.doesNotMatch(interactions, /\.cardSpeaker/);
    assert.doesNotMatch(interactions, /\.modalFrame/);
    assert.doesNotMatch(interactions, /\.reminderDialog/);
    assert.match(interactions, /\.cardOpen/);
    assert.match(interactions, /\.cardDetails/);
    assert.match(modal, /при\\s\+регистрации/);
    assert.match(modal, /по\\s\+запросу/);
    assert.match(modal, /return null;/);
  });

  test('shows only a numeric price or Бесплатно in public cards and modal', () => {
    const modal = readFileSync(MODAL, 'utf8');
    const card = readFileSync(EVENT_CARD, 'utf8');
    const interactions = readFileSync(EVENT_INTERACTIONS, 'utf8');
    const format = readFileSync(FORMAT, 'utf8');

    assert.match(modal, /const price = formatPrice\(event\.priceType, event\.priceText\);/);
    assert.match(card, /formatPrice\(event\.priceType, event\.priceText\)/);
    assert.match(card, /className=\{ui\.cardPrice\}>\{price\}<\/span>/);
    assert.match(interactions, /\.cardPrice/);
    assert.match(format, /if \(priceType === 'FREE'\) return 'Бесплатно';/);
    assert.match(format, /if \(!value \|\| !\/\\d\/u\.test\(value\)\) return 'Бесплатно';/);
    assert.doesNotMatch(format, /return priceText \?\? 'Платно'/);
  });
});
