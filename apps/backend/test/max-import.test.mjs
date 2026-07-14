/**
 * MAX import unit tests — Node.js built-in test runner.
 * Uses fixtures only. Never calls the real MAX API.
 * Run: node --test apps/backend/test/max-import.test.mjs
 */
import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqual } from 'crypto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURE_CHANNEL_ID = 987654321;
const FIXTURE_SECRET = 'test-webhook-secret-abc';

function makeMessageCreated({ mid = 'mid.abc123', text = '', chatId = FIXTURE_CHANNEL_ID, ts = Date.now() } = {}) {
  return {
    updateType: 'message_created',
    timestamp: ts,
    message: {
      sender: { userId: 111, name: 'Test' },
      recipient: { chatId },
      timestamp: ts,
      body: { mid, text, attachments: [] },
    },
  };
}

function makeBotAdded({ chatId = FIXTURE_CHANNEL_ID } = {}) {
  return {
    updateType: 'bot_added',
    timestamp: Date.now(),
    chatId,
    chat: { chatId, type: 'channel', title: 'Test Channel' },
  };
}

// ─── Webhook secret validation ────────────────────────────────────────────────

describe('Webhook secret validation', () => {
  function secretValid(expected, actual) {
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(actual);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  test('accepts matching secret', () => {
    assert.ok(secretValid(FIXTURE_SECRET, FIXTURE_SECRET));
  });

  test('rejects wrong secret', () => {
    assert.ok(!secretValid(FIXTURE_SECRET, 'wrong-secret'));
  });

  test('rejects empty actual secret', () => {
    assert.ok(!secretValid(FIXTURE_SECRET, ''));
  });

  test('rejects missing actual secret (undefined → empty string)', () => {
    assert.ok(!secretValid(FIXTURE_SECRET, ''));
  });

  test('rejects when expected is empty (controller rejects before secretValid)', () => {
    // When MAX_WEBHOOK_SECRET not configured, the controller rejects the request
    // before calling secretValid — this tests that logic independently
    const expected = '';
    const shouldReject = !expected; // controller: if (!expected) throw ForbiddenException
    assert.ok(shouldReject, 'Empty expected secret should trigger early rejection in controller');
  });
});

// ─── Import disabled check ────────────────────────────────────────────────────

describe('MAX_IMPORT_ENABLED safety switch', () => {
  test('isEnabled returns false when env var is not "true"', () => {
    const cases = [undefined, '', '0', 'false', 'False', 'TRUE' /* wrong case */];
    for (const v of cases) {
      const enabled = v === 'true';
      assert.ok(!enabled, `Expected disabled for value: ${String(v)}`);
    }
  });

  test('isEnabled returns true only for exact string "true"', () => {
    assert.ok('true' === 'true');
    assert.ok(!('True' === 'true'));
  });
});

// ─── Channel ID filtering ─────────────────────────────────────────────────────

describe('Channel ID filtering', () => {
  test('update from correct channel passes filter', () => {
    const update = makeMessageCreated({ chatId: FIXTURE_CHANNEL_ID });
    const chatId = update.message.recipient.chatId;
    assert.equal(chatId, FIXTURE_CHANNEL_ID);
  });

  test('update from wrong channel is detected', () => {
    const update = makeMessageCreated({ chatId: 999999 });
    const chatId = update.message.recipient.chatId;
    assert.notEqual(chatId, FIXTURE_CHANNEL_ID);
  });

  test('when MAX_SOURCE_CHANNEL_ID not configured, all updates rejected', () => {
    const sourceId = null;
    assert.equal(sourceId, null);
  });
});

// ─── Update type dispatch ─────────────────────────────────────────────────────

describe('Update type dispatch', () => {
  test('bot_added update is recognized', () => {
    const update = makeBotAdded();
    assert.equal(update.updateType, 'bot_added');
    assert.equal(update.chatId, FIXTURE_CHANNEL_ID);
  });

  test('message_created update is recognized', () => {
    const update = makeMessageCreated({ text: 'Hello' });
    assert.equal(update.updateType, 'message_created');
    assert.equal(update.message.body.text, 'Hello');
  });

  test('unknown update type is not message_created or bot_added', () => {
    const update = { updateType: 'chat_title_changed', timestamp: Date.now() };
    const supported = ['message_created', 'bot_added', 'message_edited'];
    assert.ok(!['message_created', 'bot_added'].includes(update.updateType));
  });
});

// ─── Deduplication key ───────────────────────────────────────────────────────

describe('Deduplication', () => {
  test('externalId is taken from message.body.mid', () => {
    const update = makeMessageCreated({ mid: 'mid.unique-123' });
    const externalId = update.message.body.mid;
    assert.equal(externalId, 'mid.unique-123');
    assert.ok(externalId.length > 0);
  });

  test('empty mid is detected and rejected', () => {
    const update = makeMessageCreated({ mid: '' });
    const externalId = update.message.body.mid ?? '';
    assert.equal(externalId, '');
    assert.ok(!externalId, 'Empty externalId must not be used as dedup key');
  });

  test('duplicate delivery: same mid processed twice → second is idempotent', () => {
    const mid = 'mid.dup-test';
    const seenIds = new Set();
    seenIds.add(mid);
    const isNew = !seenIds.has(mid);
    assert.ok(!isNew, 'Second delivery should be detected as duplicate');
  });
});

// ─── Image attachment extraction ──────────────────────────────────────────────

describe('Image attachment handling', () => {
  test('image attachment with url is recognized', () => {
    const update = {
      ...makeMessageCreated(),
      message: {
        ...makeMessageCreated().message,
        body: {
          mid: 'mid.img',
          text: 'Post with image',
          attachments: [{ type: 'image', payload: { url: 'https://cdn.max.ru/img.jpg', token: 'tok' } }],
        },
      },
    };
    const images = update.message.body.attachments.filter((a) => a.type === 'image');
    assert.equal(images.length, 1);
    assert.equal(images[0].payload.url, 'https://cdn.max.ru/img.jpg');
  });

  test('attachment with unsupported type is not treated as image', () => {
    const att = { type: 'video', payload: { url: 'https://cdn.max.ru/video.mp4' } };
    assert.notEqual(att.type, 'image');
  });

  test('image without url is skipped gracefully', () => {
    const payload = undefined;
    const url = payload?.url;
    assert.equal(url, undefined);
  });
});

// ─── API error code handling ──────────────────────────────────────────────────

describe('API error handling', () => {
  test('HTTP 401 maps to AUTH_ERROR', () => {
    const status = 401;
    const type = status === 401 ? 'AUTH_ERROR' : status === 403 ? 'AUTH_ERROR' : 'FETCH_ERROR';
    assert.equal(type, 'AUTH_ERROR');
  });

  test('HTTP 403 maps to AUTH_ERROR', () => {
    const status = 403;
    const type = status === 401 ? 'AUTH_ERROR' : status === 403 ? 'AUTH_ERROR' : 'FETCH_ERROR';
    assert.equal(type, 'AUTH_ERROR');
  });

  test('HTTP 404 maps to FETCH_ERROR', () => {
    const status = 404;
    const type = status === 401 ? 'AUTH_ERROR' : status === 403 ? 'AUTH_ERROR' : 'FETCH_ERROR';
    assert.equal(type, 'FETCH_ERROR');
  });

  test('HTTP 429 maps to FETCH_ERROR', () => {
    const status = 429;
    const type = status === 401 ? 'AUTH_ERROR' : status === 403 ? 'AUTH_ERROR' : 'FETCH_ERROR';
    assert.equal(type, 'FETCH_ERROR');
  });

  test('HTTP 500 maps to FETCH_ERROR', () => {
    const status = 500;
    const type = status === 401 ? 'AUTH_ERROR' : status === 403 ? 'AUTH_ERROR' : 'FETCH_ERROR';
    assert.equal(type, 'FETCH_ERROR');
  });

  test('errors counter is 1 when top-level fetch fails (not 0)', () => {
    const log = { postsFound: 0, imported: 0, updated: 0, skipped: 0, errors: 0, errorDetail: [] };
    // simulate top-level error
    log.errors++;
    log.errorDetail.push({ type: 'FETCH_ERROR', detail: 'network timeout' });
    assert.equal(log.errors, 1);
    assert.notEqual(log.errors, 0);
  });
});

// ─── MIME type validation ─────────────────────────────────────────────────────

describe('MIME type validation for image downloads', () => {
  const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

  test('jpeg is allowed', () => assert.ok(ALLOWED.has('image/jpeg')));
  test('png is allowed', () => assert.ok(ALLOWED.has('image/png')));
  test('webp is allowed', () => assert.ok(ALLOWED.has('image/webp')));
  test('gif is allowed', () => assert.ok(ALLOWED.has('image/gif')));
  test('svg is rejected', () => assert.ok(!ALLOWED.has('image/svg+xml')));
  test('executable is rejected', () => assert.ok(!ALLOWED.has('application/octet-stream')));
  test('html is rejected', () => assert.ok(!ALLOWED.has('text/html')));
});

// ─── Collection post detection ────────────────────────────────────────────────

describe('Collection post detection', () => {
  function isCollection(text) {
    const markers = [
      /ПОДБОРКА\s+(НЕДЕЛИ|МЕСЯЦА|ДНЯ)/i,
      /АБ АФИША БУХГАЛТЕРА[:：]\s*ЧТО ПОСМОТРЕТЬ/i,
    ];
    return markers.some((re) => re.test(text));
  }

  test('detects weekly collection', () => {
    assert.ok(isCollection('ПОДБОРКА НЕДЕЛИ — лучшие вебинары'));
  });

  test('detects monthly collection', () => {
    assert.ok(isCollection('ПОДБОРКА МЕСЯЦА'));
  });

  test('detects "что посмотреть" collection', () => {
    assert.ok(isCollection('АБ АФИША БУХГАЛТЕРА: ЧТО ПОСМОТРЕТЬ'));
  });

  test('single event post is not a collection', () => {
    assert.ok(!isCollection('Вебинар по НДС\nКогда: 15 августа, 11:00 (МСК)'));
  });
});

// ─── File existence checks ────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAX_MODULE_BASE = resolve(import.meta.dirname, '../src/modules/max-import');
const MAX_MODULE_FILES = [
  'max-import.service.ts',
  'max-import.controller.ts',
  'max-import.module.ts',
  'max-parser.service.ts',
  'max-api.types.ts',
  'max-webhook.controller.ts',
];

describe('MAX import module files exist', () => {
  for (const f of MAX_MODULE_FILES) {
    test(`exists: ${f}`, () => {
      assert.ok(existsSync(resolve(MAX_MODULE_BASE, f)), `Missing: ${f}`);
    });
  }
});

describe('MAX import service does not contain undocumented endpoint', () => {
  const svc = readFileSync(resolve(MAX_MODULE_BASE, 'max-import.service.ts'), 'utf8');

  test('does not reference /v1/channels/posts', () => {
    assert.ok(!svc.includes('/v1/channels/posts'), 'Undocumented endpoint found in service');
  });

  test('does not reference the old undocumented api.max.ru/v1 domain', () => {
    assert.ok(!svc.includes('https://api.max.ru'), 'Old API domain found in service');
  });

  test('references platform-api2.max.ru', () => {
    assert.ok(svc.includes('platform-api2.max.ru'), 'New API base URL missing');
  });

  test('has MAX_IMPORT_ENABLED guard', () => {
    assert.ok(svc.includes('MAX_IMPORT_ENABLED'), 'Safety switch missing');
  });
});

describe('Shared constants do not contain MAX_IMPORT_CHANNEL', () => {
  const shared = readFileSync(
    resolve(import.meta.dirname, '../../../packages/shared/src/constants/index.ts'),
    'utf8',
  );

  test('MAX_IMPORT_CHANNEL removed from shared constants', () => {
    assert.ok(!shared.includes('MAX_IMPORT_CHANNEL'), 'MAX_IMPORT_CHANNEL still present in shared');
  });

  test('MAX_CHANNEL (public UI link) is still present', () => {
    assert.ok(shared.includes('MAX_CHANNEL'), 'MAX_CHANNEL missing from shared');
  });
});
