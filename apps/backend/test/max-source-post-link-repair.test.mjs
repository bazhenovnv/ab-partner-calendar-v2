import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const service = read(
  'apps/backend/src/modules/max-import/max-source-post-link.service.ts',
);
const moduleFile = read(
  'apps/backend/src/modules/max-import/max-import.module.ts',
);

describe('MAX canonical source post link repair', () => {
  test('resolves official MAX post URLs by stored message IDs', () => {
    assert.match(service, /platform-api2\.max\.ru/);
    assert.match(service, /message_ids/);
    assert.match(service, /mids\.join\(','\)/);
    assert.match(service, /data\.messages/);
    assert.match(service, /message\.body\?\.mid/);
    assert.match(service, /message\.url/);
  });

  test('repairs only legacy MAX source links and validates source channel', () => {
    assert.match(service, /source:\s*'MAX'/);
    assert.match(service, /sourcePostUrl:\s*\{ contains: '\/join\/' \}/);
    assert.match(service, /externalId:\s*\{ not: null \}/);
    assert.match(service, /message\.recipient\?\.chat_id !== sourceChannelId/);
    assert.match(service, /hostname !== 'max\.ru'/);
    assert.match(service, /data:\s*\{ sourcePostUrl: exactUrl \}/);
  });

  test('runs on backend bootstrap and continues repairing new imports', () => {
    assert.match(service, /OnApplicationBootstrap/);
    assert.match(service, /onApplicationBootstrap\(\)/);
    assert.match(service, /@Cron\('\*\/1 \* \* \* \*'/);
    assert.match(moduleFile, /MaxSourcePostLinkService/);
  });

  test('does not invent a direct MAX post URL when API omits message.url', () => {
    assert.match(service, /if \(!exactUrl\) continue/);
    assert.doesNotMatch(service, /\?mid=/);
    assert.doesNotMatch(service, /sourceChannelUrl.*externalId/);
  });
});
