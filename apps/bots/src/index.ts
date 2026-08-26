import 'dotenv/config';
import { setDefaultResultOrder } from 'node:dns';
import { startTelegramBot } from './telegram/bot';
import { startMaxBot } from './max/bot';

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
}

async function prepareTelegramLongPolling(token: string): Promise<void> {
  setDefaultResultOrder('ipv6first');
  console.log('[bots] DNS result order set to ipv6first for Telegram connectivity');

  const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: false }),
  });
  const payload = await response.json().catch(() => null) as TelegramApiResponse | null;

  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      `Telegram deleteWebhook failed: ${response.status} ${payload?.description ?? 'unknown error'}`,
    );
  }

  console.log('[bots] Telegram webhook cleared; long polling can start');
}

async function main() {
  console.log('[bots] Starting bot service...');

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const maxToken = process.env.MAX_BOT_TOKEN;

  if (tgToken) {
    await prepareTelegramLongPolling(tgToken);
    startTelegramBot(tgToken);
    console.log('[bots] Telegram bot started');
  } else {
    console.warn('[bots] TELEGRAM_BOT_TOKEN not set, Telegram bot skipped');
  }

  if (maxToken) {
    startMaxBot(maxToken);
    console.log('[bots] MAX bot webhook mode enabled');
  } else {
    console.warn('[bots] MAX_BOT_TOKEN not set, MAX bot skipped');
  }

  console.log('[bots] Bot service ready');
}

main().catch((err) => {
  console.error('[bots] Fatal error:', err);
  process.exit(1);
});