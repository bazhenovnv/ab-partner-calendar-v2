import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(REPO_ROOT, path), 'utf8');

const appModule = read('apps/backend/src/app.module.ts');
const dispatcher = read('apps/backend/src/modules/email-notifications/email-notifications.service.ts');
const smtp = read('apps/backend/src/modules/email-notifications/smtp-mail.service.ts');
const envExample = read('.env.example');

test('needs-attention notifications are wired to the backend scheduler', () => {
  assert.match(appModule, /EmailNotificationsModule/);
  assert.match(dispatcher, /Cron\(CronExpression\.EVERY_MINUTE\)/);
  assert.match(dispatcher, /type: 'NEEDS_ATTENTION'/);
  assert.match(dispatcher, /sentAt: null/);
  assert.match(dispatcher, /failedAt: null/);
});

test('attention email explains the problem and administrator action', () => {
  assert.match(smtp, /Событие попало в раздел «Требует внимания»/);
  assert.match(smtp, /Причины и действия администратора/);
  assert.match(smtp, /Что проверить:/);
  assert.match(smtp, /adminUrl/);
  assert.match(smtp, /ATTENTION_EMAIL_TO/);
  assert.match(smtp, /info-event@a-b\.ru/);
});

test('SMTP supports secure and STARTTLS configurations without a new package dependency', () => {
  assert.match(smtp, /createTlsConnection/);
  assert.match(smtp, /STARTTLS/);
  assert.match(smtp, /AUTH PLAIN/);
  assert.match(smtp, /AUTH LOGIN/);
  assert.match(envExample, /SMTP_HOST=/);
  assert.match(envExample, /SMTP_PORT=465/);
  assert.match(envExample, /SMTP_SECURE=true/);
  assert.match(envExample, /SMTP_STARTTLS=true/);
  assert.match(envExample, /ATTENTION_EMAIL_TO=info-event@a-b\.ru/);
});

test('repeated unresolved MAX warnings are suppressed while real mail failures are logged', () => {
  assert.match(dispatcher, /DUPLICATE_WINDOW_MS = 15 \* 60 \* 1000/);
  assert.match(dispatcher, /message,/);
  assert.match(dispatcher, /sentAt: \{ not: null \}/);
  assert.match(dispatcher, /context: 'needs-attention-email'/);
  assert.match(dispatcher, /failReason/);
});
