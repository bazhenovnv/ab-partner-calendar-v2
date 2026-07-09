/**
 * Bots smoke tests — structural checks.
 * Uses Node.js built-in test runner (node:test), zero extra dependencies.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const BOTS = resolve(import.meta.dirname, '..');
const SRC = join(BOTS, 'src');

describe('Bot files exist', () => {
  const files = [
    'index.ts',
    'telegram/bot.ts',
    'max/bot.ts',
  ];

  for (const f of files) {
    test(`src/${f}`, () => {
      assert.ok(existsSync(join(SRC, f)), `Missing: apps/bots/src/${f}`);
    });
  }
});
