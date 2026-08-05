import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCRIPT = readFileSync(
  resolve(ROOT, 'infra/scripts/promote-approved-max-events.sh'),
  'utf8',
);

describe('Approved hidden MAX event repair', () => {
  test('targets exactly the three user-approved events', () => {
    assert.match(SCRIPT, /АВТОУСН/);
    assert.match(SCRIPT, /2026-07-30/);
    assert.match(SCRIPT, /ФНС УЖЕ ВИДИТ РИСКИ/);
    assert.match(SCRIPT, /2026-08-04/);
    assert.match(SCRIPT, /КАДРОВЫЕ ИЗМЕНЕНИЯ ИДУТ/);
    assert.match(SCRIPT, /2026-08-05/);
  });

  test('requires one matching record and a stored image', () => {
    assert.match(SCRIPT, /matching\.length !== 1/);
    assert.match(SCRIPT, /image is absent; approval cannot be applied/);
  });

  test('persists the explicit manual publication override', () => {
    assert.match(SCRIPT, /status: 'PUBLISHED'/);
    assert.match(SCRIPT, /autoStatus: 'COMPLETED'/);
    assert.match(SCRIPT, /isManualStatus: true/);
    assert.match(SCRIPT, /manual-recovery-approved/);
    assert.match(SCRIPT, /APPROVED_EVENT_STATUS_REPAIR_OK/);
  });

  test('then delegates to the verified built-image promotion', () => {
    assert.match(SCRIPT, /promote-built-max-ingestion\.sh/);
    assert.match(SCRIPT, /bash -n "\$BASE_SCRIPT"/);
    assert.match(SCRIPT, /bash "\$BASE_SCRIPT" "\$TARGET"/);
  });
});
