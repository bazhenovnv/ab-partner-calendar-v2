import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const modal = readFileSync(
  resolve(root, 'apps/frontend/src/components/events/EventModalProvider.tsx'),
  'utf8',
);
const figma = readFileSync(
  resolve(root, 'apps/frontend/src/app/event-modal-figma-final.css'),
  'utf8',
);
const transitions = readFileSync(
  resolve(root, 'apps/frontend/src/app/event-modal-transitions.css'),
  'utf8',
);

function mobileBlock(css) {
  return css.match(/@media \(max-width: 767px\) \{[\s\S]*\n\}/)?.[0] ?? '';
}

test('modal shows complete structured location and speaker details', () => {
  assert.match(modal, /function getEventModalLocation\(event: PublicEvent\)/);
  assert.match(modal, /function includesLocationPart\(container: string, part: string\)/);
  assert.match(modal, /city && !includesLocationPart\(address, city\)/);
  assert.match(modal, /`\$\{city\}, \$\{address\}`/);
  assert.match(modal, /city && !includesLocationPart\(venue, city\)/);
  assert.match(modal, /\{ label: 'Адрес:', value \}/);
  assert.match(modal, /\{ label: 'Место:', value \}/);
  assert.match(modal, /event\.format === 'ONLINE' \|\| event\.format === 'HYBRID'/);
  assert.match(modal, /event\.format !== 'ONLINE' && Boolean\(location\)/);
  assert.match(modal, /data-event-modal-online/);
  assert.match(modal, /data-event-modal-location/);
  assert.match(modal, /location\.label/);
  assert.match(modal, /location\.value/);
  assert.match(modal, /data-event-modal-speakers/);
  assert.match(modal, /speakers\.join\(', '\)/);
});

test('390px mobile modal keeps the measured Figma text badges and icons', () => {
  const css = mobileBlock(figma);
  const finalCss = mobileBlock(transitions);

  assert.match(css, /width: min\(348px, calc\(100vw - 24px\)\) !important;/);
  assert.match(css, /height: min\(684px, calc\(100dvh - 24px\)\) !important;/);
  assert.match(css, /event-modal-v2_imageStage__[\s\S]*?width: 309px !important;/);

  assert.match(css, /event-modal-v2_status__[\s\S]*?min-height: 23px !important;[\s\S]*?font-size: 11px !important;/);
  assert.match(css, /event-modal-v2_statusLive__[\s\S]*?width: 125px !important;/);
  assert.match(css, /event-modal-v2_statusPlanned__[\s\S]*?width: 157px !important;/);
  assert.match(css, /event-modal-v2_statusCompleted__[\s\S]*?width: 117px !important;/);
  assert.match(css, /event-modal-v2_close__[\s\S]*?width: 24px !important;[\s\S]*?height: 21px !important;[\s\S]*?font-size: 25px !important;/);

  assert.match(css, /event-modal-v2_title__[\s\S]*?font-size: 18px !important;/);
  assert.match(css, /event-modal-v2_lead__[\s\S]*?event-modal-v2_description__[\s\S]*?font-size: 10px !important;/);

  assert.match(css, /event-modal-v2_facts__[\s\S]*?width: 309px !important;[\s\S]*?height: 52\.79px !important;/);
  assert.match(css, /event-modal-v2_factIcon__[\s\S]*?width: 27px !important;[\s\S]*?height: 27px !important;/);
  assert.match(css, /event-modal-v2_label__[\s\S]*?font-size: 6px !important;/);
  assert.match(css, /event-modal-v2_value__[\s\S]*?font-size: 7px !important;/);

  assert.match(css, /event-modal-v2_primary__[\s\S]*?event-modal-v2_remind__[\s\S]*?width: 143px !important;[\s\S]*?height: 44px !important;[\s\S]*?font-size: 10px !important;/);
  assert.match(css, /event-modal-v2_actionIcon__[\s\S]*?width: 14px !important;[\s\S]*?height: 14px !important;/);
  assert.match(finalCss, /event-modal-v2_lines__[\s\S]*?font-size: 11px !important;/);
});
