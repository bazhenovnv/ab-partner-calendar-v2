import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const PICKER = read('apps/frontend/src/components/admin/CityPicker.tsx');
const EDIT = read('apps/frontend/src/app/admin/events/[id]/page.tsx');
const CREATE = read('apps/frontend/src/app/admin/events/new/page.tsx');

describe('Admin event canonical city forms', () => {
  test('city picker loads only active cities and auto-matches one exact legacy name', () => {
    assert.match(PICKER, /\/admin\/cities\?isActive=true&limit=500&sortBy=name&sortDir=asc/);
    assert.match(PICKER, /exactMatches\.length !== 1/);
    assert.match(PICKER, /onChange\(city\.id, city\.name\)/);
  });

  test('edit form stores and submits both cityId and cityName', () => {
    assert.match(EDIT, /cityId: ev\.cityId \?\? ''/);
    assert.match(EDIT, /cityId: form\.cityId \|\| null/);
    assert.match(EDIT, /<CityPicker/);
    assert.match(EDIT, /Выберите активный город из справочника городов/);
    assert.match(EDIT, /Не выбран активный город из справочника/);
  });

  test('new form requires canonical city for OFFLINE and HYBRID and supports HYBRID', () => {
    assert.match(CREATE, /form\.format === 'OFFLINE' \|\| form\.format === 'HYBRID'/);
    assert.match(CREATE, /cityId: form\.cityId \|\| null/);
    assert.match(CREATE, /cityName: form\.cityName\.trim\(\) \|\| null/);
    assert.match(CREATE, /<option value="HYBRID">Онлайн \+ офлайн<\/option>/);
    assert.match(CREATE, /<CityPicker/);
  });
});
