import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const compose = read('docker-compose.production.v2.yml');
const botsIndex = read('apps/bots/src/index.ts');
const transport = read('apps/backend/src/common/telegram/telegram-api.ts');
const hostScript = resolve(ROOT, 'infra/scripts/configure-telegram-ipv6-host.sh');

test('production isolates IPv6 egress to backend and bots', () => {
  assert.match(compose, /telegram-egress:/);
  assert.match(compose, /enable_ipv6: true/);
  assert.match(compose, /TELEGRAM_IP_FAMILY: \$\{TELEGRAM_IP_FAMILY:-6\}/);
  assert.match(compose, /com\.docker\.network\.host_ipv6/);
  assert.doesNotMatch(compose, /NODE_OPTIONS:.*ipv6first/);
});

test('Telegram bot polling prefers IPv6', () => {
  assert.match(botsIndex, /setDefaultResultOrder\('ipv6first'\)/);
});

test('backend Telegram transport selects IPv6 without changing MAX or SMTP', () => {
  assert.match(transport, /hostname: 'api\.telegram\.org'/);
  assert.match(transport, /family: telegramIpFamily\(\)/);
  assert.match(transport, /TELEGRAM_IP_FAMILY/);
});

test('host IPv6 persistence script is valid Bash', () => {
  execFileSync('bash', ['-n', hostScript], { stdio: 'pipe' });
});
