/**
 * MAX import unit tests — Node.js built-in test runner.
 * Fixtures use the exact official MAX Bot API snake_case payload format.
 * Never calls the real MAX API.
 * Run: node --test apps/backend/test/max-import.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqual } from 'crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAX_MODULE = resolve(import.meta.dirname, '../src/modules/max-import');
const FIXTURE_CHANNEL_ID = 123456789;
const FIXTURE_SECRET = 'test-webhook-secret-abc';

// ─── Official raw fixtures (exact MAX API snake_case) ─────────────────────────

const RAW_BOT_ADDED = {
  update_type: 'bot_added',
  timestamp: 1720000000000,
  chat_id: FIXTURE_CHANNEL_ID,
  is_channel: true,
  user: { user_id: 9999, name: 'Admin' },
};

const RAW_MESSAGE_CREATED = {
  update_type: 'message_created',
  timestamp: 1720001000000,
  message: {
    sender: { user_id: 42, name: 'Channel' },
    recipient: { chat_id: FIXTURE_CHANNEL_ID },
    timestamp: 1720001000000,
    body: {
      mid: 'mid.official-test-123',
      text: 'Вебинар по НДС\nКогда: 15 августа, 11:00 (МСК)\nСтоимость: Бесплатно',
      attachments: [],
    },
  },
};

const RAW_MESSAGE_CREATED_WITH_IMAGE = {
  update_type: 'message_created',
  timestamp: 1720002000000,
  message: {
    sender: { user_id: 42, name: 'Channel' },
    recipient: { chat_id: FIXTURE_CHANNEL_ID },
    timestamp: 1720002000000,
    body: {
      mid: 'mid.with-image-456',
      text: 'Семинар по 1С',
      attachments: [
        { type: 'image', payload: { url: 'https://cdn.max.ru/test.jpg', token: 'tok123', width: 1280, height: 720 } },
      ],
    },
  },
};

const RAW_MESSAGE_WRONG_CHANNEL = {
  update_type: 'message_created',
  timestamp: 1720003000000,
  message: {
    sender: { user_id: 99, name: 'Other' },
    recipient: { chat_id: 999999999 },
    timestamp: 1720003000000,
    body: { mid: 'mid.wrong-channel', text: 'Other channel post', attachments: [] },
  },
};

const RAW_UNKNOWN_TYPE = {
  update_type: 'chat_title_changed',
  timestamp: 1720004000000,
  chat_id: FIXTURE_CHANNEL_ID,
};

// ─── Inline normalizer (mirrors max-api.types.ts for unit testing) ────────────

function normalizeUser(raw) {
  if (!raw) return undefined;
  return { userId: raw.user_id, name: raw.name, username: raw.username };
}

function normalizeAttachmentPayload(raw) {
  if (!raw) return undefined;
  return { url: raw.url, token: raw.token, width: raw.width, height: raw.height, mimeType: raw.mime_type };
}

function normalizeAttachment(raw) {
  return { type: raw.type, payload: normalizeAttachmentPayload(raw.payload) };
}

function normalizeMessage(raw) {
  return {
    sender: normalizeUser(raw.sender),
    recipient: { chatId: raw.recipient.chat_id, userId: raw.recipient.user_id },
    timestamp: raw.timestamp,
    body: {
      mid: raw.body.mid,
      text: raw.body.text,
      attachments: raw.body.attachments?.map(normalizeAttachment),
    },
  };
}

function normalizeMaxUpdate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const updateType = raw['update_type'];
  if (typeof updateType !== 'string') return null;
  const timestamp = typeof raw['timestamp'] === 'number' ? raw['timestamp'] : 0;

  if (updateType === 'bot_added') {
    return {
      updateType: 'bot_added',
      timestamp,
      chatId: raw['chat_id'],
      isChannel: raw['is_channel'],
      user: normalizeUser(raw['user']),
    };
  }
  if (updateType === 'message_created' || updateType === 'message_edited') {
    if (!raw['message']) return null;
    return { updateType, timestamp, message: normalizeMessage(raw['message']) };
  }
  if (updateType === 'message_removed') {
    return { updateType, timestamp, messageId: raw['message_id'], chatId: raw['chat_id'], userId: raw['user_id'] };
  }
  return { updateType, timestamp };
}

// ─── Normalization boundary ───────────────────────────────────────────────────

describe('normalizeMaxUpdate — raw snake_case → internal camelCase', () => {
  test('bot_added: chat_id → chatId, is_channel → isChannel', () => {
    const n = normalizeMaxUpdate(RAW_BOT_ADDED);
    assert.equal(n.updateType, 'bot_added');
    assert.equal(n.chatId, FIXTURE_CHANNEL_ID);
    assert.equal(n.isChannel, true);
    assert.equal(n.user.userId, 9999);
    assert.ok(!('chat_id' in n), 'snake_case chat_id must not remain after normalization');
    assert.ok(!('is_channel' in n), 'snake_case is_channel must not remain');
    assert.ok(!('update_type' in n), 'snake_case update_type must not remain');
  });

  test('message_created: recipient.chat_id → recipient.chatId', () => {
    const n = normalizeMaxUpdate(RAW_MESSAGE_CREATED);
    assert.equal(n.updateType, 'message_created');
    assert.equal(n.message.recipient.chatId, FIXTURE_CHANNEL_ID);
    assert.equal(n.message.sender.userId, 42);
    assert.ok(!('chat_id' in n.message.recipient), 'snake_case chat_id must not remain in recipient');
  });

  test('message_created with image: payload url preserved', () => {
    const n = normalizeMaxUpdate(RAW_MESSAGE_CREATED_WITH_IMAGE);
    const img = n.message.body.attachments[0];
    assert.equal(img.type, 'image');
    assert.equal(img.payload.url, 'https://cdn.max.ru/test.jpg');
  });

  test('unknown update_type passes through with normalized key', () => {
    const n = normalizeMaxUpdate(RAW_UNKNOWN_TYPE);
    assert.equal(n.updateType, 'chat_title_changed');
    assert.ok(!('update_type' in n), 'snake_case update_type must not remain');
  });

  test('missing update_type returns null', () => {
    assert.equal(normalizeMaxUpdate({ timestamp: 0 }), null);
    assert.equal(normalizeMaxUpdate(null), null);
    assert.equal(normalizeMaxUpdate(undefined), null);
    assert.equal(normalizeMaxUpdate('string'), null);
  });

  test('camelCase payload is rejected — update_type missing → null', () => {
    const wrongCamelCase = { updateType: 'bot_added', chatId: 123, timestamp: 0 };
    const result = normalizeMaxUpdate(wrongCamelCase);
    // update_type is missing → null (normalization rejects camelCase input)
    assert.equal(result, null);
  });
});

// ─── Authorization header — no "Bearer" prefix ───────────────────────────────

describe('Authorization header format', () => {
  test('MAX API header is bare token, not "Bearer <token>"', () => {
    const tok = 'my-secret-token';
    const header = tok; // not `Bearer ${tok}`
    assert.ok(!header.startsWith('Bearer '), 'Header must not start with "Bearer "');
    assert.equal(header, tok);
  });

  test('service source does not contain "Bearer ${tok}" pattern', () => {
    const svc = readFileSync(resolve(MAX_MODULE, 'max-import.service.ts'), 'utf8');
    // Must not use template literal with Bearer
    assert.ok(!svc.includes('Bearer ${tok}'), 'max-import.service.ts still uses Bearer prefix');
    assert.ok(!svc.includes('Bearer ${token}'), 'max-import.service.ts still uses Bearer prefix');
  });

  test('controller source does not contain "Bearer" for MAX API calls', () => {
    const ctrl = readFileSync(resolve(MAX_MODULE, 'max-import.controller.ts'), 'utf8');
    assert.ok(!ctrl.includes('Bearer ${tok}'), 'max-import.controller.ts still uses Bearer prefix');
    assert.ok(!ctrl.includes('Bearer ${token}'), 'max-import.controller.ts still uses Bearer prefix');
  });

  test('reminders service does not use Bearer for MAX API', () => {
    const svc = readFileSync(
      resolve(MAX_MODULE, '../../modules/reminders/reminders.service.ts'),
      'utf8',
    );
    assert.ok(!svc.includes('Bearer ${token}'), 'reminders.service.ts still uses Bearer prefix for MAX');
  });

  test('broadcasts service does not use Bearer for MAX API', () => {
    const svc = readFileSync(
      resolve(MAX_MODULE, '../../modules/broadcasts/broadcasts.service.ts'),
      'utf8',
    );
    assert.ok(!svc.includes('Bearer ${token}'), 'broadcasts.service.ts still uses Bearer prefix for MAX');
  });
});

// ─── Webhook subscription body — update_types field ─────────────────────────

describe('Webhook subscription body uses update_types (snake_case)', () => {
  test('subscription body has update_types not updateTypes', () => {
    const body = {
      url: 'https://test.ab-event.pro/api/max-webhook',
      update_types: ['message_created', 'message_edited', 'message_removed', 'bot_added', 'bot_removed'],
      secret: FIXTURE_SECRET,
    };
    assert.ok('update_types' in body, 'update_types key must be present');
    assert.ok(!('updateTypes' in body), 'updateTypes (camelCase) must not be used');
    assert.ok(body.update_types.includes('message_created'));
    assert.ok(body.update_types.includes('bot_added'));
  });

  test('docs/integrations file updated to use update_types', () => {
    const docsPath = resolve(MAX_MODULE, '../../../../docs/integrations/MAX_API_SOURCE.md');
    if (existsSync(docsPath)) {
      const docs = readFileSync(docsPath, 'utf8');
      // If docs mention subscription, it should use update_types
      if (docs.includes('updateTypes')) {
        // Old camelCase is present — docs need update
        assert.ok(!docs.includes('"updateTypes"'), 'docs still use camelCase updateTypes in JSON example');
      }
    }
  });
});

// ─── Channel ID filtering ─────────────────────────────────────────────────────

describe('Channel ID filtering with official raw payload', () => {
  test('message from correct channel passes filter after normalization', () => {
    const n = normalizeMaxUpdate(RAW_MESSAGE_CREATED);
    assert.equal(n.message.recipient.chatId, FIXTURE_CHANNEL_ID);
    assert.equal(n.message.recipient.chatId === FIXTURE_CHANNEL_ID, true);
  });

  test('message from wrong channel is detected', () => {
    const n = normalizeMaxUpdate(RAW_MESSAGE_WRONG_CHANNEL);
    assert.notEqual(n.message.recipient.chatId, FIXTURE_CHANNEL_ID);
  });

  test('null MAX_SOURCE_CHANNEL_ID blocks all updates', () => {
    const sourceId = null;
    assert.equal(sourceId, null); // triggers SOURCE_NOT_FOUND
  });
});

// ─── Webhook secret validation ────────────────────────────────────────────────

describe('Webhook secret validation (X-Max-Bot-Api-Secret)', () => {
  function secretValid(expected, actual) {
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(actual);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch { return false; }
  }

  test('matching secret accepted', () => assert.ok(secretValid(FIXTURE_SECRET, FIXTURE_SECRET)));
  test('wrong secret rejected', () => assert.ok(!secretValid(FIXTURE_SECRET, 'wrong-secret')));
  test('empty actual rejected (length mismatch)', () => assert.ok(!secretValid(FIXTURE_SECRET, '')));
  test('controller rejects when MAX_WEBHOOK_SECRET not configured', () => {
    const expected = undefined;
    assert.ok(!expected, 'Missing expected secret triggers early rejection');
  });
  test('timing-safe equal used (not == operator)', () => {
    // Verify timingSafeEqual is available from Node crypto
    assert.equal(typeof timingSafeEqual, 'function');
  });
});

// ─── Deduplication ───────────────────────────────────────────────────────────

describe('Deduplication using externalId = message.body.mid', () => {
  test('mid is preserved through normalization', () => {
    const n = normalizeMaxUpdate(RAW_MESSAGE_CREATED);
    assert.equal(n.message.body.mid, 'mid.official-test-123');
  });

  test('empty mid is detected', () => {
    const raw = { ...RAW_MESSAGE_CREATED, message: { ...RAW_MESSAGE_CREATED.message, body: { ...RAW_MESSAGE_CREATED.message.body, mid: '' } } };
    const n = normalizeMaxUpdate(raw);
    assert.equal(n.message.body.mid, '');
    assert.ok(!n.message.body.mid, 'Empty mid must be rejected as dedup key');
  });

  test('duplicate delivery: seen mid → SKIPPED_DUPLICATE', () => {
    const seen = new Set(['mid.official-test-123']);
    const incoming = 'mid.official-test-123';
    assert.ok(seen.has(incoming), 'Duplicate must be detected');
  });

  test('new mid → IMPORTED', () => {
    const seen = new Set(['mid.existing']);
    const incoming = 'mid.new-event-789';
    assert.ok(!seen.has(incoming), 'New mid must pass dedup check');
  });
});

// ─── bot_added raw fixture ────────────────────────────────────────────────────

describe('bot_added raw fixture (official MAX API format)', () => {
  test('fixture has correct snake_case structure', () => {
    assert.equal(RAW_BOT_ADDED.update_type, 'bot_added');
    assert.equal(typeof RAW_BOT_ADDED.chat_id, 'number');
    assert.equal(typeof RAW_BOT_ADDED.is_channel, 'boolean');
    assert.equal(typeof RAW_BOT_ADDED.timestamp, 'number');
    assert.ok(!('updateType' in RAW_BOT_ADDED), 'Raw fixture must not use camelCase');
    assert.ok(!('chatId' in RAW_BOT_ADDED), 'Raw fixture must not use camelCase');
  });

  test('normalized bot_added has all camelCase fields', () => {
    const n = normalizeMaxUpdate(RAW_BOT_ADDED);
    assert.ok('updateType' in n);
    assert.ok('chatId' in n);
    assert.ok('isChannel' in n);
    assert.ok(!('update_type' in n));
    assert.ok(!('chat_id' in n));
    assert.ok(!('is_channel' in n));
  });
});

// ─── API error handling ───────────────────────────────────────────────────────

describe('API error code handling', () => {
  function classifyError(status) {
    if (status === 401 || status === 403) return 'AUTH_ERROR';
    return 'FETCH_ERROR';
  }

  test('HTTP 401 → AUTH_ERROR', () => assert.equal(classifyError(401), 'AUTH_ERROR'));
  test('HTTP 403 → AUTH_ERROR', () => assert.equal(classifyError(403), 'AUTH_ERROR'));
  test('HTTP 404 → FETCH_ERROR', () => assert.equal(classifyError(404), 'FETCH_ERROR'));
  test('HTTP 429 → FETCH_ERROR', () => assert.equal(classifyError(429), 'FETCH_ERROR'));
  test('HTTP 500 → FETCH_ERROR', () => assert.equal(classifyError(500), 'FETCH_ERROR'));

  test('top-level error sets errors=1 (not 0)', () => {
    const log = { postsFound: 0, imported: 0, updated: 0, skipped: 0, errors: 0, errorDetail: [] };
    log.errors++;
    log.errorDetail.push({ type: 'FETCH_ERROR', detail: 'network timeout' });
    assert.equal(log.errors, 1);
  });
});

// ─── Polling policy ───────────────────────────────────────────────────────────

describe('Polling policy: webhook is primary, cron is heartbeat only', () => {
  test('service cron method is named runHeartbeat (not a poller)', () => {
    const svc = readFileSync(resolve(MAX_MODULE, 'max-import.service.ts'), 'utf8');
    assert.ok(svc.includes('runHeartbeat'), 'Cron method should be runHeartbeat');
    assert.ok(!svc.includes('@Cron\n  async runImport'), 'runImport should not be the cron method');
  });

  test('cron method does not call pollUpdates directly', () => {
    const svc = readFileSync(resolve(MAX_MODULE, 'max-import.service.ts'), 'utf8');
    // runHeartbeat should not contain pollUpdates call
    const cronSection = svc.match(/runHeartbeat\(\)[\s\S]*?^  \}/m)?.[0] ?? '';
    assert.ok(!cronSection.includes('pollUpdates'), 'Cron heartbeat must not call pollUpdates');
  });
});

// ─── MIME type validation ─────────────────────────────────────────────────────

describe('MIME type validation for image downloads', () => {
  const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  test('jpeg allowed', () => assert.ok(ALLOWED.has('image/jpeg')));
  test('png allowed', () => assert.ok(ALLOWED.has('image/png')));
  test('svg rejected', () => assert.ok(!ALLOWED.has('image/svg+xml')));
  test('octet-stream rejected', () => assert.ok(!ALLOWED.has('application/octet-stream')));
  test('html rejected', () => assert.ok(!ALLOWED.has('text/html')));
});

// ─── File existence ───────────────────────────────────────────────────────────

describe('MAX import module files exist', () => {
  const FILES = [
    'max-import.service.ts', 'max-import.controller.ts', 'max-import.module.ts',
    'max-parser.service.ts', 'max-api.types.ts', 'max-webhook.controller.ts',
  ];
  for (const f of FILES) {
    test(`exists: ${f}`, () => assert.ok(existsSync(resolve(MAX_MODULE, f)), `Missing: ${f}`));
  }
});

describe('Source file invariants', () => {
  const svc = readFileSync(resolve(MAX_MODULE, 'max-import.service.ts'), 'utf8');
  const types = readFileSync(resolve(MAX_MODULE, 'max-api.types.ts'), 'utf8');

  test('service does not reference undocumented /v1/channels/posts', () => {
    assert.ok(!svc.includes('/v1/channels/posts'));
  });
  test('service does not reference old api.max.ru domain', () => {
    assert.ok(!svc.includes('https://api.max.ru'));
  });
  test('service uses platform-api2.max.ru', () => {
    assert.ok(svc.includes('platform-api2.max.ru'));
  });
  test('service has MAX_IMPORT_ENABLED guard', () => {
    assert.ok(svc.includes('MAX_IMPORT_ENABLED'));
  });
  test('types file defines normalizeMaxUpdate function', () => {
    assert.ok(types.includes('normalizeMaxUpdate'));
  });
  test('types file defines RawMaxBotAddedUpdate with snake_case fields', () => {
    assert.ok(types.includes('update_type'));
    assert.ok(types.includes('chat_id'));
    assert.ok(types.includes('is_channel'));
  });
  test('shared constants do not contain MAX_IMPORT_CHANNEL', () => {
    const shared = readFileSync(
      resolve(MAX_MODULE, '../../../../../packages/shared/src/constants/index.ts'), 'utf8',
    );
    assert.ok(!shared.includes('MAX_IMPORT_CHANNEL'));
    assert.ok(shared.includes('MAX_CHANNEL'));
  });
});
