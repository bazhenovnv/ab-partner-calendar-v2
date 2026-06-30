import { REMINDER_OPTIONS } from '@ab-afisha/shared';

export function startMaxBot(token: string) {
  console.log('[max-bot] MAX bot initialised (HTTP mode)');
  pollMaxUpdates(token);
}

async function pollMaxUpdates(token: string, offset = 0) {
  const BASE = 'https://api.max.ru/v1/bots';
  try {
    const res = await fetch(`${BASE}/updates?offset=${offset}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn('[max-bot] Poll error:', res.status, res.statusText);
    } else {
      const data = await res.json() as any;
      const updates: any[] = data.updates ?? [];
      for (const update of updates) {
        await handleMaxUpdate(token, update);
        offset = Math.max(offset, (update.update_id ?? 0) + 1);
      }
    }
  } catch (err) {
    console.error('[max-bot] Poll failed:', err);
  }
  setTimeout(() => pollMaxUpdates(token, offset), 3000);
}

async function handleMaxUpdate(token: string, update: any) {
  const message = update.message;
  if (!message) return;
  const chatId = message.sender?.user_id ?? message.chat_id;
  const text: string = message.body?.text ?? '';
  if (text.startsWith('/start')) {
    await sendMaxMessage(token, chatId,
      'Привет! Я бот АБ Афиши Бухгалтера.\n\nПерейди на сайт ab-event.pro и нажми «Напомнить» у нужного мероприятия.',
    );
  }
}

async function sendMaxMessage(token: string, chatId: string, text: string) {
  try {
    await fetch('https://api.max.ru/v1/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('[max-bot] Send error:', err);
  }
}
