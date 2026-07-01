import { Bot } from 'grammy';
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

// Telegram userId → { eventId, botUserId } while awaiting time input
const awaitingReminderTime = new Map<number, { eventId: string; botUserId: string }>();

export function startTelegramBot(token: string) {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    const payload = ctx.match?.trim();
    if (payload?.startsWith('remind_')) {
      const parts = payload.replace('remind_', '').split('_');
      const eventId = parts[0];
      const botUserId = parts[1] ?? String(ctx.from!.id);
      awaitingReminderTime.set(ctx.from!.id, { eventId, botUserId });
      await ctx.reply(
        `Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\n<b>ДД.ММ.ГГГГ ЧЧ:ММ</b>\n\nПример: <b>15.07.2025 09:00</b>\n\nНапоминание должно быть раньше начала мероприятия.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    await ctx.reply(
      `Привет! Я бот АБ Афиши Бухгалтера.\n\nЯ помогу напомнить о предстоящих мероприятиях для бухгалтеров.\n\nИспользуй меня через кнопку «Напомнить» на сайте ${SITE_URL}`,
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `Чтобы получить напоминание о мероприятии:\n1. Перейди на сайт ${SITE_URL}\n2. Найди нужное мероприятие\n3. Нажми кнопку «Напомнить»\n4. Выбери «Телеграм»\n5. Введи дату и время напоминания в боте (формат: ДД.ММ.ГГГГ ЧЧ:ММ МСК)`,
    );
  });

  bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const state = awaitingReminderTime.get(userId);
    if (!state) return;

    const remindAt = parseMskDateInput(ctx.message.text);
    if (!remindAt) {
      await ctx.reply(
        'Не удалось распознать дату. Введите в формате <b>ДД.ММ.ГГГГ ЧЧ:ММ</b>, например: <b>15.07.2025 09:00</b>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (remindAt.getTime() <= Date.now()) {
      await ctx.reply('Указанное время уже прошло. Введите будущую дату и время.');
      return;
    }

    awaitingReminderTime.delete(userId);
    const result = await saveReminder(state.botUserId, state.eventId, remindAt);

    if (result.ok) {
      await ctx.reply(
        `Готово! Напоминание установлено на <b>${formatMsk(remindAt)}</b> МСК.\n\nМы напомним вам об этом мероприятии.`,
        { parse_mode: 'HTML' },
      );
    } else if (result.duplicate) {
      await ctx.reply(
        `Напоминание на <b>${formatMsk(remindAt)}</b> МСК уже установлено для этого мероприятия.`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply(
        `Не удалось сохранить напоминание. Пожалуйста, попробуйте позже или обратитесь на сайт ${SITE_URL}`,
      );
    }
  });

  bot.catch((err) => { console.error('[telegram-bot] Error:', err); });
  bot.start();
}
