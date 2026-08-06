import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const RELIABLE = readFileSync(
  resolve(ROOT, 'src/modules/max-import/max-reliable-import.service.ts'),
  'utf8',
);

describe('MAX live synchronization cadence', () => {
  test('reconciles missed webhook updates every five minutes', () => {
    assert.match(RELIABLE, /@Cron\('\*\/5 \* \* \* \*'/);
    assert.match(RELIABLE, /MAX reliable 5-minute sync/);
    assert.doesNotMatch(RELIABLE, /MAX reliable hourly sync/);
  });

  test('keeps durable marker advancement after successful processing only', () => {
    assert.match(RELIABLE, /await this\.processDurably\(rawUpdate, log\)/);
    assert.match(RELIABLE, /log\.errors === 0/);
    assert.match(RELIABLE, /await this\.saveStoredMarker\(batch\.marker\)/);
  });
});
