import { SITE_URL } from '@ab-afisha/shared';

const MSK_OFFSET_MS = 3 * 60 * 60_000;
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:3001';

function parseMskDateInput(text: string): Date | null {
  const t = text.trim();
  let match = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(t);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    const utcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min) - MSK_OFFSET_MS;
    const d = new Date(utcMs);
    return isNaN(d.getTime()) ? null : d;
  }
  match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/.exec(t);
  if (match) {
    const [, yyyy, mm, dd, hh, min] = match;
    const utcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min) - MSK_OFFSET_MS;
    const d = new Date(utcMs);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatMsk(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

type SaveResult = { ok: true } | { ok: false; duplicate: true } | { ok: false; duplicate: false };

async function saveReminder(botUserId: string, eventId: string, remindAt: Date): Promise<SaveResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botUserId,
        eventId,
        remindAt: remindAt.toISOString(),
        timezone: 'Europe/Moscow',
      }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, duplicate: true };
    return { ok: false, duplicate: false };
  } catch {
    return { ok: false, duplicate: false };
  }
}

// chatId → { eventId, botUserId } while awaiting time input
const awaitingReminderTime = new Map<string, { eventId: string; botUserId: string }>();

export function startMaxBot(token: string) {
  console.log('[max-bot] MAX bot initialised (HTTP polling mode)');
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

  const chatId: string = String(message.sender?.user_id ?? message.chat_id);
  const text: string = (message.body?.text ?? '').trim();

  if (text.startsWith('/start')) {
    const payload = text.replace('/start', '').trim();
    if (payload.startsWith('remind_')) {
      const parts = payload.replace('remind_', '').split('_');
      const eventId = parts[0];
      const botUserId = parts[1] ?? chatId;
      awaitingReminderTime.set(chatId, { eventId, botUserId });
      await sendMaxMessage(token, chatId,
        'Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\nДД.ММ.ГГГГ ЧЧ:ММ\n\nПример: 15.07.2025 09:00\n\nНапоминание должно быть раньше начала мероприятия.',
      );
      return;
    }

    await sendMaxMessage(token, chatId,
      `Привет! Я бот АБ Афиши Бухгалтера.\n\nЧтобы получить напоминание, перейди на сайт ${SITE_URL} и нажми «Напомнить» у нужного мероприятия.`,
    );
    return;
  }

  const state = awaitingReminderTime.get(chatId);
  if (state) {
    const remindAt = parseMskDateInput(text);
    if (!remindAt) {
      await sendMaxMessage(token, chatId, 'Не удалось распознать дату. Введите в формате ДД.ММ.ГГГГ ЧЧ:ММ, например: 15.07.2025 09:00');
      return;
    }
    if (remindAt.getTime() <= Date.now()) {
      await sendMaxMessage(token, chatId, 'Указанное время уже прошло. Введите будущую дату и время.');
      return;
    }
    awaitingReminderTime.delete(chatId);
    const result = await saveReminder(state.botUserId, state.eventId, remindAt);
    if (result.ok) {
      await sendMaxMessage(token, chatId, `Готово! Напоминание установлено на ${formatMsk(remindAt)} МСК.\n\nМы напомним вам об этом мероприятии.`);
    } else if (result.duplicate) {
      await sendMaxMessage(token, chatId, `Напоминание на ${formatMsk(remindAt)} МСК уже установлено для этого мероприятия.`);
    } else {
      await sendMaxMessage(token, chatId, `Не удалось сохранить напоминание. Пожалуйста, попробуйте позже или обратитесь на сайт ${SITE_URL}`);
    }
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
