import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const SERVICE = resolve(
  import.meta.dirname,
  '../src/modules/max-import/max-import.service.ts',
);

describe('MAX event modal image variant', () => {
  test('creates a physical 1280 by 1280 cover crop from the original image', () => {
    const source = readFileSync(SERVICE, 'utf8');

    assert.match(
      source,
      /resize\(1280, 1280, \{ fit: 'cover', position: 'attention' \}\)/,
    );
    assert.match(source, /modalUrl: publicPath\(modalName\)/);
    assert.doesNotMatch(
      source,
      /resize\(1600, 900, \{ fit: 'inside', withoutEnlargement: true \}\)/,
    );
  });
});
