import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(FRONTEND, '../..');
const SERVICE = readFileSync(
  resolve(ROOT, 'apps/backend/src/modules/reminders/reminders.service.ts'),
  'utf8',
);

describe('Reminder delivery reliability', () => {
  test('addresses MAX private users with user_id instead of chat_id', () => {
    assert.match(SERVICE, /messages\?user_id=\$\{userId\}/);
    assert.doesNotMatch(SERVICE, /JSON\.stringify\(\{ chat_id: externalId, text \}\)/);
  });

  test('retries transient network and 5xx failures with a hard timeout', () => {
    assert.match(SERVICE, /DELIVERY_ATTEMPTS = 3/);
    assert.match(SERVICE, /AbortSignal\.timeout\(DELIVERY_TIMEOUT_MS\)/);
    assert.match(SERVICE, /response\.status < 500/);
  });

  test('persists failed reminder delivery into the system ErrorLog', () => {
    assert.match(SERVICE, /prisma\.errorLog\.create/);
    assert.match(SERVICE, /context: 'reminder-dispatch'/);
    assert.match(SERVICE, /reminderId: reminder\.id/);
    assert.match(SERVICE, /channel: reminder\.botUser\.channel/);
  });

  test('does not automatically requeue historical FAILED reminders', () => {
    assert.match(SERVICE, /where: \{ status: 'PENDING', remindAt: \{ lte: now \} \}/);
  });
});
