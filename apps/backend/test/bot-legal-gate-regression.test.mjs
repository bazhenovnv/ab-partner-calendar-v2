import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(import.meta.dirname, '../src/modules/bots/bots.service.ts'),
  'utf8',
);

test('every bot start requires a fresh core legal confirmation', () => {
  assert.ok(source.includes('const snapshot = await this.prisma.botUser.upsert'));
  assert.ok(source.includes('legalAcceptedAt: null'));
  assert.ok(source.includes('allowMarketingMessages: false'));
});

test('accepting the legal gate refreshes the stored acceptance timestamp', () => {
  assert.ok(source.includes('async acceptLegal'));
  assert.ok(source.includes('legalAcceptedAt: now'));
  assert.ok(source.includes('lastActivityAt: now'));
});

test('marketing consent remains optional and separate from the mandatory gate', () => {
  assert.ok(source.includes('...(acceptBroadcastConsent ? { broadcastConsentAcceptedAt: now } : {})'));
});
