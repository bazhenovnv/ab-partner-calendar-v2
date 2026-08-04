import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const HEADER = `${FRONTEND}/src/components/layout/SiteHeader.tsx`;
const FINAL_STYLES = `${FRONTEND}/src/app/homepage-controls-event-cards-final.css`;

describe('MAX header action icon', () => {
  test('uses the tracked MAX asset inside a dedicated optical-correction wrapper', () => {
    const header = readFileSync(HEADER, 'utf8');

    assert.match(header, /max-header-icon\.png/);
    assert.match(header, /pub-header-action-icon-wrap--max/);
    assert.match(header, /pub-header-action-icon--max/);
  });

  test('removes the square raster background and matches neighbouring icon size', () => {
    const styles = readFileSync(FINAL_STYLES, 'utf8');

    assert.match(
      styles,
      /\.pub-header-action-icon-wrap--max\s*\{[\s\S]*overflow: hidden !important;[\s\S]*border-radius: 50% !important;/,
    );
    assert.match(
      styles,
      /\.pub-header-action-icon--max\s*\{[\s\S]*clip-path: circle\(38\.5% at 50% 50%\) !important;[\s\S]*transform: scale\(1\.2\) !important;/,
    );
  });
});
