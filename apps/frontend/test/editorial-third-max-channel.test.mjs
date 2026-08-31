import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const SERVICE = read('apps/backend/src/modules/editorial/editorial.service.ts');
const DISCOVERY = read('apps/backend/src/modules/editorial/editorial-max-discovery.service.ts');
const PUBLISHER = read('apps/frontend/src/app/admin/editorial/EditorialPublisher.tsx');

const THIRD_KEY = 'MAX_CHANNEL_3';
const THIRD_ENV = 'MAX_EDITORIAL_CHANNEL_3_ID';
const THIRD_URL = 'https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA';
const THIRD_LABEL = 'Макс - "АБ| Пратнер"';

describe('Editorial third MAX channel', () => {
  test('publisher registry contains the independent third MAX destination', () => {
    for (const value of [THIRD_KEY, THIRD_ENV, THIRD_URL, THIRD_LABEL]) {
      assert.ok(SERVICE.includes(value), `editorial.service.ts must contain ${value}`);
    }
  });

  test('MAX discovery can auto-bind and persist the third target', () => {
    for (const value of [THIRD_KEY, THIRD_ENV, THIRD_URL, THIRD_LABEL, 'editorial.max.binding.MAX_CHANNEL_3']) {
      assert.ok(DISCOVERY.includes(value), `editorial-max-discovery.service.ts must contain ${value}`);
    }
  });

  test('all three MAX join links are unique', () => {
    const links = [...SERVICE.matchAll(/publicUrl: '(https:\/\/max\.ru\/join\/[^']+)'/g)].map((match) => match[1]);
    assert.equal(links.length, 3);
    assert.equal(new Set(links).size, 3);
    assert.ok(links.includes(THIRD_URL));
  });

  test('frontend renders MAX channels from API dynamically', () => {
    assert.match(PUBLISHER, /channels\.filter\(\(channel\) => channel\.platform === 'MAX'\)/);
    assert.match(PUBLISHER, /channels\.map\(\(channel\) => channel\.key\)/);
    assert.match(PUBLISHER, /channelLabel\(channel\.key, channel\.name\)/);
  });
});
