import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(FRONTEND, '../..');
const CITIES = readFileSync(resolve(ROOT, 'apps/backend/src/modules/cities/cities.controller.ts'), 'utf8');
const DIRECTIONS = readFileSync(resolve(ROOT, 'apps/backend/src/modules/directions/directions.controller.ts'), 'utf8');
const GUARD = readFileSync(resolve(ROOT, 'apps/backend/src/common/guards/roles.guard.ts'), 'utf8');

function assertReadForEditorWriteForAdmin(source) {
  assert.match(source, /@Roles\('ADMIN', 'EDITOR'\)/);
  for (const route of ['@Post()', "@Put(':id')", "@Patch(':id/toggle')", "@Delete(':id')"]) {
    const index = source.indexOf(route);
    assert.ok(index >= 0, `route missing: ${route}`);
    assert.match(source.slice(index, index + 120), /@Roles\('ADMIN'\)/);
  }
}

describe('Editor reference catalogue permissions', () => {
  test('method-level role metadata overrides controller defaults', () => {
    assert.match(GUARD, /getAllAndOverride<string\[]>/);
  });

  test('editors can read cities but only admins can mutate them', () => {
    assertReadForEditorWriteForAdmin(CITIES);
  });

  test('editors can read directions but only admins can mutate them', () => {
    assertReadForEditorWriteForAdmin(DIRECTIONS);
  });
});
