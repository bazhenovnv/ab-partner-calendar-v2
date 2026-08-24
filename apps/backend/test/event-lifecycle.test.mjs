import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const service = readFileSync(
  resolve(ROOT, 'src/modules/events/event-lifecycle.service.ts'),
  'utf8',
);
const controller = readFileSync(
  resolve(ROOT, 'src/modules/events/events.controller.ts'),
  'utf8',
);

describe('event archive/delete/restore lifecycle', () => {
  test('uses a dedicated guarded lifecycle service', () => {
    assert.match(controller, /EventLifecycleService/);
    assert.match(controller, /eventLifecycleService\.archiveEvent/);
    assert.match(controller, /eventLifecycleService\.deleteEvent/);
    assert.match(controller, /eventLifecycleService\.restoreEvent/);
    assert.match(controller, /@Patch\('admin\/:id\/restore'\)/);
  });

  test('rejects repeat archive and repeat delete', () => {
    assert.match(service, /existing\.status === EventStatus\.ARCHIVE/);
    assert.match(service, /Мероприятие уже находится в архиве/);
    assert.match(service, /existing\.status === EventStatus\.DELETED/);
    assert.match(service, /Мероприятие уже удалено/);
  });

  test('guards lifecycle writes against concurrent duplicate actions', () => {
    assert.match(service, /updateMany\(\{/);
    assert.match(service, /where: \{ id, status: existing\.status \}/);
    assert.match(service, /changed\.count !== 1/);
    assert.match(service, /Статус мероприятия уже изменён/);
  });

  test('stores before and after statuses in the audit log', () => {
    assert.match(service, /before: \{ status: existing\.status \}/);
    assert.match(service, /after: \{ status: EventStatus\.ARCHIVE \}/);
    assert.match(service, /after: \{ status: EventStatus\.DELETED \}/);
    assert.match(service, /action: 'restore'/);
    assert.match(service, /after: \{ status: restoreStatus \}/);
  });

  test('legacy restoration never republishes an event automatically', () => {
    assert.match(service, /return publishedAt \? EventStatus\.HIDDEN : EventStatus\.DRAFT/);
    assert.match(service, /RESTORABLE_STATUSES/);
    assert.doesNotMatch(service, /return publishedAt \? EventStatus\.PUBLISHED/);
  });
});
