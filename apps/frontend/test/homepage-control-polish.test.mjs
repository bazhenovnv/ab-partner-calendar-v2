import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const EVENT_CARD = join(FRONTEND, 'src/components/events/EventCard.tsx');
const LAYOUT = join(FRONTEND, 'src/app/layout.tsx');
const POLISH = join(
  FRONTEND,
  'src/app/homepage-controls-event-cards-final.css',
);

describe('Homepage control and event-card polish', () => {
  test('does not render speaker text inside compact event cards', () => {
    const eventCard = readFileSync(EVENT_CARD, 'utf8');

    assert.doesNotMatch(eventCard, /event\.speaker/);
    assert.doesNotMatch(eventCard, /Спикер:/);
    assert.match(eventCard, /className=\{ui\.cardDetails\}>Подробнее →<\/span>/);
  });

  test('loads the final polish layer after legacy homepage styles', () => {
    const layout = readFileSync(LAYOUT, 'utf8');
    const legacyIndex = layout.indexOf("./footer-brand-title-alignment.css");
    const polishIndex = layout.indexOf("./homepage-controls-event-cards-final.css");

    assert.ok(legacyIndex >= 0);
    assert.ok(polishIndex > legacyIndex);
  });

  test('uses stronger event shadows and approved filter interactions', () => {
    const polish = readFileSync(POLISH, 'utf8');

    assert.match(
      polish,
      /\[data-event-results-grid\] article \{[\s\S]*0 0 12px 2px rgba\(13, 35, 68, 0\.28\),[\s\S]*0 0 26px 6px rgba\(13, 35, 68, 0\.16\)/,
    );
    assert.match(polish, /text-decoration: none !important;/);
    assert.match(
      polish,
      /\.pub-filter-reset-link:hover:not\(:disabled\)[\s\S]*color: #111111 !important;/,
    );
    assert.match(
      polish,
      /\.pub-filter-apply-btn \{[\s\S]*background: #ffffff !important;[\s\S]*box-shadow: 0 0 9px rgba\(13, 35, 68, 0\.18\) !important;/,
    );
    assert.match(
      polish,
      /\.pub-filter-apply-btn:hover:not\(:disabled\)[\s\S]*background: #7cd8b3 !important;/,
    );
    assert.match(
      polish,
      /\.pub-filter-apply-btn:active:not\(:disabled\)[\s\S]*background: #367d67 !important;/,
    );
  });

  test('keeps header controls outlined and all icons the same size', () => {
    const polish = readFileSync(POLISH, 'utf8');

    assert.match(
      polish,
      /\.pub-header-action \{[\s\S]*border: 1px solid rgba\(13, 35, 68, 0\.20\) !important;[\s\S]*box-shadow: 0 0 9px rgba\(13, 35, 68, 0\.18\) !important;/,
    );
    assert.match(
      polish,
      /\.pub-header-action-icon-wrap,[\s\S]*\.pub-header-action-icon \{[\s\S]*width: 27px !important;[\s\S]*height: 27px !important;[\s\S]*border: 0 !important;/,
    );
    assert.match(
      polish,
      /\.pub-header-action-icon \{[\s\S]*position: static !important;[\s\S]*transform: none !important;/,
    );
  });
});
