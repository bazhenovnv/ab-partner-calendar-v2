import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const SERVICE = read('apps/backend/src/modules/events/main-events.service.ts');
const CONTROLLER = read('apps/backend/src/modules/events/events.controller.ts');
const MODULE = read('apps/backend/src/modules/events/events.module.ts');

describe('Main events rolling carousel backend contract', () => {
  test('returns every ordered active main event instead of capping the API at five', () => {
    assert.match(SERVICE, /const MAIN_EVENTS_WINDOW_SIZE = 5;/);
    assert.match(SERVICE, /const activeEvents = await this\.prisma\.event\.findMany\(/);
    assert.match(SERVICE, /orderBy: \[\{ sortOrder: 'asc' \}, \{ startDate: 'asc' \}\]/);
    assert.match(
      SERVICE,
      /if \(activeEvents\.length >= MAIN_EVENTS_WINDOW_SIZE\) \{\s*return activeEvents;\s*\}/,
    );

    const activeQuery = SERVICE.match(
      /const activeEvents = await this\.prisma\.event\.findMany\(\{[\s\S]*?\n    \}\);/,
    )?.[0] ?? '';
    assert.doesNotMatch(activeQuery, /\btake\s*:/);
    assert.doesNotMatch(activeQuery, /slice\(0,\s*5\)/);
  });

  test('uses completed main events only to fill a short initial five-card window', () => {
    assert.match(
      SERVICE,
      /take: MAIN_EVENTS_WINDOW_SIZE - activeEvents\.length/,
    );
    assert.match(SERVICE, /return \[\.\.\.activeEvents, \.\.\.completedEvents\];/);
  });

  test('public main endpoint uses the uncapped service and keeps defensive filtering', () => {
    assert.match(CONTROLLER, /private readonly mainEventsService: MainEventsService/);
    assert.match(CONTROLLER, /await this\.mainEventsService\.getMainEvents\(\)/);
    assert.match(CONTROLLER, /event\.status === 'PUBLISHED' && event\.mainEvent === true/);

    const publicMainHandler = CONTROLLER.match(
      /@Get\('public\/main'\)[\s\S]*?\n  \}\n\n  @Get\('public\/:id'\)/,
    )?.[0] ?? '';
    assert.doesNotMatch(publicMainHandler, /slice\(0,\s*5\)/);
    assert.match(MODULE, /MainEventsService/);
  });
});
