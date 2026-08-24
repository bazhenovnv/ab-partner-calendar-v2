import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const FRONTEND = resolve(import.meta.dirname, '..');
const ROOT = resolve(FRONTEND, '../..');
const CONTROLLER = readFileSync(resolve(ROOT, 'apps/backend/src/modules/analytics/analytics.controller.ts'), 'utf8');
const SERVICE = readFileSync(resolve(ROOT, 'apps/backend/src/modules/analytics/analytics.service.ts'), 'utf8');
const PAGEVIEW = readFileSync(resolve(FRONTEND, 'src/components/MetrikaPageview.tsx'), 'utf8');
const EVENT_CARD = readFileSync(resolve(FRONTEND, 'src/components/events/EventCard.tsx'), 'utf8');
const EVENT_TRACKER = readFileSync(resolve(FRONTEND, 'src/components/events/EventViewTracker.tsx'), 'utf8');
const ACTIONS = readFileSync(resolve(FRONTEND, 'src/components/events/EventDetailActions.tsx'), 'utf8');

describe('Internal analytics tracking', () => {
  test('backend exposes public visit and event tracking endpoints', () => {
    assert.match(CONTROLLER, /@Post\('visit'\)/);
    assert.match(CONTROLLER, /@Post\('events\/:eventId'\)/);
    assert.match(SERVICE, /prisma\.siteVisit\.create/);
    assert.match(SERVICE, /prisma\.eventView\.create/);
  });

  test('public navigation records internal visits in parallel with Yandex Metrika', () => {
    assert.match(PAGEVIEW, /trackVisit\(url\)/);
    assert.match(PAGEVIEW, /ym\.hit\(url\)/);
  });

  test('event details and modal card opens record view actions', () => {
    assert.match(EVENT_TRACKER, /trackEventAction\(eventId, 'view'\)/);
    assert.match(EVENT_CARD, /trackEventAction\(event\.id, 'view'\)/);
  });

  test('registration and ticket actions are stored separately from views', () => {
    assert.match(ACTIONS, /event\.ticketSalesEnabled \? 'ticket' : 'register'/);
    assert.match(SERVICE, /action: 'view'/);
    assert.match(SERVICE, /action: \{ in: \['register', 'ticket', 'participate'\] \}/);
  });
});
