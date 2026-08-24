import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const service = readFileSync(
  resolve('apps/backend/src/modules/broadcasts/broadcasts.service.ts'),
  'utf8',
);

test('MAX broadcasts target a private user by user_id, not chat_id', () => {
  assert.match(service, /platform-api2\.max\.ru\/messages\?user_id=\$\{userId\}/);
  assert.match(service, /const userId = encodeURIComponent\(user\.externalId\)/);
  assert.doesNotMatch(service, /JSON\.stringify\(\{\s*chat_id:\s*user\.externalId,\s*text\s*\}\)/);
});
