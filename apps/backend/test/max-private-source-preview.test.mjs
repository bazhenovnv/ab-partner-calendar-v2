import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const REPAIR = read('apps/backend/src/modules/max-import/max-source-post-link.service.ts');
const PREVIEW = read('apps/backend/src/modules/events/max-source-preview.service.ts');
const CONTROLLER = read('apps/backend/src/modules/events/events.controller.ts');
const MODULE = read('apps/backend/src/modules/events/events.module.ts');

describe('private MAX source navigation', () => {
  test('does not poll impossible canonical links for a private source channel', () => {
    assert.match(REPAIR, /\/chats\/\$\{encodeURIComponent\(String\(sourceChannelId\)\)\}/);
    assert.match(REPAIR, /data\.is_public === true/);
    assert.match(REPAIR, /if \(!isPublic\)/);
    assert.match(REPAIR, /source channel is private/);
    assert.match(REPAIR, /CHANNEL_VISIBILITY_TTL_MS/);
    assert.match(REPAIR, /return \{ scanned: 0, repaired: 0, unresolved: 0, skipped: true \}/);
  });

  test('loads the exact source message by stored MAX mid for admin preview', () => {
    assert.match(PREVIEW, /source !== 'MAX'/);
    assert.match(PREVIEW, /externalId/);
    assert.match(PREVIEW, /\/messages\/\$\{encodeURIComponent\(event\.externalId\)\}/);
    assert.match(PREVIEW, /returnedMid !== event\.externalId/);
    assert.match(PREVIEW, /returnedChatId !== configuredChatId/);
    assert.match(PREVIEW, /message\.body\?\.text/);
    assert.match(PREVIEW, /message\.body\?\.attachments/);
    assert.match(PREVIEW, /isPublic: chat\?\.is_public === true/);
    assert.match(PREVIEW, /directPostUrl/);
  });

  test('exposes preview only through the protected admin event API', () => {
    assert.match(CONTROLLER, /@Get\('admin\/:id\/source-preview'\)/);
    assert.match(CONTROLLER, /@UseGuards\(JwtAuthGuard, RolesGuard\)/);
    assert.match(CONTROLLER, /@Roles\('ADMIN', 'EDITOR'\)/);
    assert.match(CONTROLLER, /maxSourcePreviewService\.getEventSourcePreview\(id\)/);
    assert.match(MODULE, /MaxSourcePreviewService/);
  });
});
