import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(FRONTEND, '../..');
const FILTERS_SERVICE = readFileSync(
  resolve(ROOT, 'apps/backend/src/modules/filters/filters.service.ts'),
  'utf8',
);
const SHARED_CONSTANTS = readFileSync(
  resolve(ROOT, 'packages/shared/src/constants/index.ts'),
  'utf8',
);

describe('Direction filter consistency', () => {
  test('public direction options are backed by published events', () => {
    assert.match(FILTERS_SERVICE, /events:\s*\{\s*some:\s*\{\s*event:\s*\{ status: 'PUBLISHED' \}/s);
  });

  test('every hashtag direction slug exists in the canonical direction catalogue', () => {
    const defaultsBlock = SHARED_CONSTANTS.match(/export const DEFAULT_DIRECTIONS = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
    const mappingBlock = SHARED_CONSTANTS.match(/export const HASHTAG_TO_DIRECTIONS:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
    const defaultSlugs = new Set([...defaultsBlock.matchAll(/slug: '([^']+)'/g)].map((match) => match[1]));
    const mappedSlugs = [...mappingBlock.matchAll(/\[([^\]]*)\]/g)]
      .flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]));

    assert.ok(defaultSlugs.size > 0, 'canonical directions must be present');
    for (const slug of mappedSlugs) {
      assert.ok(defaultSlugs.has(slug), `mapped direction slug must exist: ${slug}`);
    }
  });
});
