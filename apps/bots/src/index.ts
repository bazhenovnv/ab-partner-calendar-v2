import 'dotenv/config';
import { startTelegramBot } from './telegram/bot';
import { startMaxBot } from './max/bot';

async function main() {
  console.log('[bots] Starting bot service...');

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const maxToken = process.env.MAX_BOT_TOKEN;

  if (tgToken) {
    startTelegramBot(tgToken);
    console.log('[bots] Telegram bot started');
  } else {
    console.warn('[bots] TELEGRAM_BOT_TOKEN not set, Telegram bot skipped');
  }

  if (maxToken) {
    startMaxBot(maxToken);
    console.log('[bots] MAX bot started');
  } else {
    console.warn('[bots] MAX_BOT_TOKEN not set, MAX bot skipped');
  }

  console.log('[bots] Bot service ready');
}

main().catch((err) => {
  console.error('[bots] Fatal error:', err);
  process.exit(1);
});
