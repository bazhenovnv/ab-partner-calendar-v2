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
const MODAL_FIGMA = join(
  FRONTEND,
  'src/app/event-modal-figma-final.css',
);
const MODAL_TRANSITIONS = join(
  FRONTEND,
  'src/app/event-modal-transitions.css',
);
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');
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

  test('crops modal artwork into the final 1280 by 1280 square without changing event cards', () => {
    const modal = readFileSync(MODAL, 'utf8');
    const figma = readFileSync(MODAL_FIGMA, 'utf8');
    const transitions = readFileSync(MODAL_TRANSITIONS, 'utf8');
    const layout = readFileSync(LAYOUT, 'utf8');
    const card = readFileSync(EVENT_CARD, 'utf8');
    const imageRule =
      transitions.match(/\[data-event-modal-image\]\s*\{[\s\S]*?\}/)?.[0] ?? '';

    assert.match(modal, /width=\{1280\}/);
    assert.match(modal, /height=\{1280\}/);
    assert.match(modal, /data-event-modal-image/);
    assert.match(figma, /event-modal-v2_imageStage__[\s\S]*aspect-ratio: 1 \/ 1 !important/);

    assert.match(imageRule, /width: 100% !important/);
    assert.match(imageRule, /height: 100% !important/);
    assert.match(imageRule, /object-fit: cover !important/);
    assert.match(imageRule, /object-position: center !important/);
    assert.doesNotMatch(imageRule, /object-fit:\s*contain/);

    assert.ok(
      layout.indexOf("event-modal-figma-final.css") <
        layout.indexOf("event-modal-transitions.css"),
      'The square crop contract must load after the Figma modal overrides',
    );

    assert.doesNotMatch(card, /data-event-modal-image/);
  });

  test('prefers dedicated modal artwork for both regular and main events', () => {
    const content = readFileSync(MODAL_CONTENT, 'utf8');
    const imageSelector = content.match(
      /export function getEventModalImageUrl[\s\S]*$/,
    )?.[0] ?? '';

    assert.match(imageSelector, /if \(event\.mainEvent\)/);
    assert.match(
      imageSelector,
      /image\.modalUrl \?\?[\s\S]*image\.mainEventUrl \?\?[\s\S]*image\.originalUrl/,
    );

    const regularBranch = imageSelector.split('if (event.mainEvent)')[1]?.split('return (')[2] ?? '';
    assert.ok(regularBranch.indexOf('image.modalUrl') >= 0);
    assert.ok(regularBranch.indexOf('image.originalUrl') > regularBranch.indexOf('image.modalUrl'));
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
    assert.match(content, /при\\s\+регистрации/);
    assert.match(content, /по\\s\+запросу/);
    assert.match(content, /уточняется/);
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
    assert.match(format, /if \(!value \|\| !\/\\d\/\.test\(value\)\) return 'Бесплатно';/);
    assert.doesNotMatch(format, /return priceText \?\? 'Платно'/);
  });
});
