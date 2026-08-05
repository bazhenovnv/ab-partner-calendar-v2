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
  test('uses one dedicated cleanup module and a complete speaker selector', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /cleanEventModalDescription/);
    assert.match(modal, /getEventModalImageUrl/);
    assert.match(modal, /getEventModalSpeakers/);
    assert.doesNotMatch(modal, /function sanitizeDescription/);
    assert.doesNotMatch(modal, /function cleanSpeaker/);
    assert.match(
      modal,
      /cleanEventModalDescription\(event\.shortDescription, event\)/,
    );
    assert.match(
      modal,
      /cleanEventModalDescription\(event\.fullDescription, event\)/,
    );
    assert.match(modal, /const speakers = getEventModalSpeakers\(event\)/);
    assert.match(modal, /speakers\.length > 1 \? 'Спикеры:' : 'Спикер:'/);
    assert.match(modal, /speakers\.join\(', '\)/);
    assert.match(modal, /data-event-modal-speakers/);
  });

  test('extracts every speaker with the legacy TypeScript-compatible matcher', () => {
    const content = readFileSync(MODAL_CONTENT, 'utf8');

    assert.match(content, /export function getEventModalSpeakers/);
    assert.match(content, /appendSpeakersFromSource\(speakers, event\.speaker\)/);
    assert.match(content, /appendSpeakersFromSource\(speakers, event\.fullDescription\)/);
    assert.match(content, /appendSpeakersFromSource\(speakers, event\.shortDescription\)/);
    assert.match(content, /SPEAKER_MARKER_SOURCE/);
    assert.match(content, /SPEAKER_NAME_SOURCE/);
    assert.match(content, /function collectMatches/);
    assert.match(content, /collectMatches\(plainText, markerPattern\)/);
    assert.match(content, /collectMatches\(plainText, titledSpeakerPattern\)/);
    assert.match(content, /&#x\(\[0-9a-f\]\+\)/);
    assert.match(content, /&#\(\\d\+\)/);
    assert.match(content, /toLocaleLowerCase\('ru-RU'\)/);
    assert.ok(!content.includes('matchAll('));
    assert.ok(!content.includes('\\p{Lu}'));
  });

  test('removes microphone speaker tails from plain and nested HTML descriptions', () => {
    const content = readFileSync(MODAL_CONTENT, 'utf8');

    assert.match(content, /function removeInlineSpeakerFragments/);
    assert.match(content, /decodeBasicEntities\(value\)/);
    assert.match(content, /inner\.search\(markerPattern\)/);
    assert.match(content, /htmlToPlainText\(inner\.slice\(0, markerIndex\)\)/);
    assert.match(content, /escapeHtml\(editorialPrefix\)/);
    assert.match(content, /let result = removeInlineSpeakerFragments\(value\)/);
    assert.match(content, /result = removeInlineSpeakerFragments\(result\)/);
  });

  test('resets the copy viewport when the full no-store event replaces its preview', () => {
    const modal = readFileSync(MODAL, 'utf8');

    assert.match(modal, /cache: 'no-store'/);
    assert.match(modal, /const textScrollRef = useRef<HTMLDivElement>\(null\)/);
    assert.match(modal, /ref=\{textScrollRef\}/);
    assert.match(modal, /textScrollRef\.current\?\.scrollTo\(\{ top: 0, left: 0 \}\)/);
    assert.match(
      modal,
      /\[event\.id, event\.shortDescription, event\.fullDescription\]/,
    );
    assert.match(modal, /data-event-modal-copy-scroll/);
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
    assert.match(modal, /data-event-modal-image-stage/);
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
    assert.match(content, /getEventModalSpeakers\(event\)\.map\(normalizeComparableText\)/);
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

  test('keeps speaker and price metadata out of compact cards', () => {
    const modal = readFileSync(MODAL, 'utf8');
    const card = readFileSync(EVENT_CARD, 'utf8');
    const interactions = readFileSync(EVENT_INTERACTIONS, 'utf8');

    assert.doesNotMatch(card, /event\.speaker/);
    assert.doesNotMatch(card, /Спикер:/);
    assert.doesNotMatch(card, /formatPrice/);
    assert.doesNotMatch(card, /cardPrice/);
    assert.doesNotMatch(interactions, /\.cardSpeaker/);
    assert.doesNotMatch(interactions, /\.cardPrice/);
    assert.doesNotMatch(interactions, /\.modalFrame/);
    assert.doesNotMatch(interactions, /\.reminderDialog/);
    assert.match(interactions, /\.cardOpen/);
    assert.match(interactions, /\.cardDetails/);
    assert.match(modal, /return null;/);
  });

  test('formats price in the modal while compact cards follow the approved sketch', () => {
    const modal = readFileSync(MODAL, 'utf8');
    const card = readFileSync(EVENT_CARD, 'utf8');
    const interactions = readFileSync(EVENT_INTERACTIONS, 'utf8');
    const format = readFileSync(FORMAT, 'utf8');

    assert.match(modal, /const price = formatPrice\(event\.priceType, event\.priceText\);/);
    assert.doesNotMatch(card, /formatPrice/);
    assert.doesNotMatch(card, /cardPrice/);
    assert.doesNotMatch(interactions, /\.cardPrice/);
    assert.match(format, /if \(priceType === 'FREE'\) return 'Бесплатно';/);
    assert.match(format, /if \(!value \|\| !\/\\d\/\.test\(value\)\) return 'Бесплатно';/);
    assert.doesNotMatch(format, /return priceText \?\? 'Платно'/);
  });
});
