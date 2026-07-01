import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import { SITE_URL } from '@ab-afisha/shared';

const MSK_OFFSET_MS = 3 * 60 * 60_000;
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:3001';
const API_BASE = `${BACKEND_URL}/api`;
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN ?? '';
const BOT_HEADERS = { 'Content-Type': 'application/json', 'X-Bot-Internal-Token': BOT_TOKEN };

// ── helpers ────────────────────────────────────────────────────────────────

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

// ── backend API calls ───────────────────────────────────────────────────────

interface BotUserSnapshot {
  id: string;
  legalAcceptedAt: string | null;
  broadcastConsentAcceptedAt: string | null;
  phone: string | null;
  allowMarketingMessages: boolean;
}

async function apiBotUpsert(
  externalId: string,
  username?: string | null,
  firstName?: string | null,
): Promise<BotUserSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/bots/users/upsert`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({ channel: 'TELEGRAM', externalId, username, firstName }),
    });
    return res.ok ? (res.json() as Promise<BotUserSnapshot>) : null;
  } catch {
    return null;
  }
}

async function apiAcceptLegal(id: string, acceptBroadcastConsent: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bots/users/${id}/accept-legal`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({ acceptBroadcastConsent }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiSavePhone(id: string, phone: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bots/users/${id}/phone`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({ phone }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiPhoneRequired(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bots/config`);
    if (!res.ok) return false;
    const data = await res.json() as { phoneRequired: boolean };
    return data.phoneRequired === true;
  } catch {
    return false;
  }
}

type SaveResult = { ok: true } | { ok: false; duplicate: true } | { ok: false; duplicate: false };

async function saveReminder(botUserId: string, eventId: string, remindAt: Date): Promise<SaveResult> {
  try {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: BOT_HEADERS,
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

// ── per-user state machine ──────────────────────────────────────────────────

type UserState =
  | { step: 'awaitingLegal'; botUserId: string; pendingEventId?: string; allowMarketing: boolean }
  | { step: 'awaitingPhone'; botUserId: string; pendingEventId?: string }
  | { step: 'awaitingReminderTime'; botUserId: string; eventId: string };

const userState = new Map<number, UserState>();

// ── legal notice text ───────────────────────────────────────────────────────

function legalNoticeText(includeMarketing: boolean): string {
  const links = [
    `• <a href="${SITE_URL}/legal/privacy">Политика конфиденциальности</a>`,
    `• <a href="${SITE_URL}/legal/terms">Пользовательское соглашение</a>`,
    `• <a href="${SITE_URL}/legal/consent">Согласие на обработку персональных данных</a>`,
  ];
  if (includeMarketing) {
    links.push(`• <a href="${SITE_URL}/legal/broadcast-consent">Согласие на информационные рассылки</a>`);
  }
  return (
    `Прежде чем продолжить, ознакомьтесь с документами:\n\n` +
    links.join('\n') +
    `\n\nНажмите кнопку «Принимаю», чтобы подтвердить согласие и продолжить.`
  );
}

// ── start handler ───────────────────────────────────────────────────────────

async function handleStart(
  tgUserId: number,
  username: string | undefined,
  firstName: string | undefined,
  payload: string,
  reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>,
) {
  const user = await apiBotUpsert(String(tgUserId), username, firstName);
  if (!user) {
    await reply(`Сервис временно недоступен. Пожалуйста, попробуйте позже.`);
    return;
  }

  const pendingEventId = payload.startsWith('remind_')
    ? payload.replace('remind_', '').split('_')[0]
    : undefined;

  // Step 1: legal notice
  if (!user.legalAcceptedAt) {
    userState.set(tgUserId, {
      step: 'awaitingLegal',
      botUserId: user.id,
      pendingEventId,
      allowMarketing: user.allowMarketingMessages,
    });
    const kb = new InlineKeyboard().text('Принимаю', 'accept_legal');
    await reply(legalNoticeText(user.allowMarketingMessages), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: kb,
    });
    return;
  }

  // Step 2: phone
  const phoneRequired = await apiPhoneRequired();
  if (phoneRequired && !user.phone) {
    userState.set(tgUserId, { step: 'awaitingPhone', botUserId: user.id, pendingEventId });
    const kb = new Keyboard()
      .requestContact('📱 Поделиться номером')
      .resized()
      .oneTime();
    await reply(
      `Для продолжения укажите номер телефона.\n\nНажмите кнопку «Поделиться номером» или введите его вручную в формате +7XXXXXXXXXX.`,
      { reply_markup: kb },
    );
    return;
  }

  // Step 3: proceed to reminder or welcome
  if (pendingEventId) {
    userState.set(tgUserId, {
      step: 'awaitingReminderTime',
      botUserId: user.id,
      eventId: pendingEventId,
    });
    await reply(
      `Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\n<b>ДД.ММ.ГГГГ ЧЧ:ММ</b>\n\nПример: <b>15.07.2025 09:00</b>`,
      { parse_mode: 'HTML' },
    );
  } else {
    await reply(
      `Привет! Я бот АБ Афиши Бухгалтера.\n\nЯ помогу напомнить о предстоящих мероприятиях для бухгалтеров.\n\nИспользуй меня через кнопку «Напомнить» на сайте ${SITE_URL}`,
    );
  }
}

// ── bot entry point ─────────────────────────────────────────────────────────

export function startTelegramBot(token: string) {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    const tgUserId = ctx.from!.id;
    const payload = ctx.match?.trim() ?? '';
    await handleStart(
      tgUserId,
      ctx.from!.username,
      ctx.from!.first_name,
      payload,
      (text, opts) => ctx.reply(text, opts as any),
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `Чтобы получить напоминание о мероприятии:\n1. Перейди на сайт ${SITE_URL}\n2. Найди нужное мероприятие\n3. Нажми кнопку «Напомнить»\n4. Выбери «Телеграм»\n5. Введи дату и время напоминания в боте (формат: ДД.ММ.ГГГГ ЧЧ:ММ МСК)`,
    );
  });

  // Legal acceptance via inline button
  bot.callbackQuery('accept_legal', async (ctx) => {
    const tgUserId = ctx.from.id;
    const state = userState.get(tgUserId);
    if (!state || state.step !== 'awaitingLegal') {
      await ctx.answerCallbackQuery();
      return;
    }

    await apiAcceptLegal(state.botUserId, state.allowMarketing);
    await ctx.answerCallbackQuery({ text: 'Согласие принято.' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });

    // Check phone next
    const phoneRequired = await apiPhoneRequired();
    if (phoneRequired) {
      userState.set(tgUserId, {
        step: 'awaitingPhone',
        botUserId: state.botUserId,
        pendingEventId: state.pendingEventId,
      });
      const kb = new Keyboard().requestContact('📱 Поделиться номером').resized().oneTime();
      await ctx.reply(
        `Для продолжения укажите номер телефона.\n\nНажмите «Поделиться номером» или введите +7XXXXXXXXXX.`,
        { reply_markup: kb },
      );
      return;
    }

    userState.delete(tgUserId);
    if (state.pendingEventId) {
      userState.set(tgUserId, {
        step: 'awaitingReminderTime',
        botUserId: state.botUserId,
        eventId: state.pendingEventId,
      });
      await ctx.reply(
        `Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\n<b>ДД.ММ.ГГГГ ЧЧ:ММ</b>\n\nПример: <b>15.07.2025 09:00</b>`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply(
        `Привет! Я бот АБ Афиши Бухгалтера.\n\nИспользуй меня через кнопку «Напомнить» на сайте ${SITE_URL}`,
      );
    }
  });

  // Phone contact (native share)
  bot.on('message:contact', async (ctx) => {
    const tgUserId = ctx.from.id;
    const state = userState.get(tgUserId);
    if (!state || state.step !== 'awaitingPhone') return;

    const phone = ctx.message.contact.phone_number;
    await apiSavePhone(state.botUserId, phone);
    userState.delete(tgUserId);

    if (state.pendingEventId) {
      userState.set(tgUserId, {
        step: 'awaitingReminderTime',
        botUserId: state.botUserId,
        eventId: state.pendingEventId,
      });
      await ctx.reply(
        `Спасибо! Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\n<b>ДД.ММ.ГГГГ ЧЧ:ММ</b>\n\nПример: <b>15.07.2025 09:00</b>`,
        { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } },
      );
    } else {
      await ctx.reply(
        `Спасибо! Теперь вы можете получать напоминания через кнопку «Напомнить» на сайте ${SITE_URL}`,
        { reply_markup: { remove_keyboard: true } },
      );
    }
  });

  // Text messages: phone input or reminder time
  bot.on('message:text', async (ctx) => {
    const tgUserId = ctx.from.id;
    const state = userState.get(tgUserId);
    if (!state) return;

    if (state.step === 'awaitingPhone') {
      const raw = ctx.message.text.trim();
      // Accept +7..., 8..., or 7... with 10-11 digits
      const cleaned = raw.replace(/[\s\-()]/g, '');
      if (!/^(\+7|7|8)\d{10}$/.test(cleaned)) {
        await ctx.reply(
          'Не удалось распознать номер. Введите в формате <b>+7XXXXXXXXXX</b>.',
          { parse_mode: 'HTML' },
        );
        return;
      }
      const normalised = '+7' + cleaned.slice(-10);
      await apiSavePhone(state.botUserId, normalised);
      userState.delete(tgUserId);

      if (state.pendingEventId) {
        userState.set(tgUserId, {
          step: 'awaitingReminderTime',
          botUserId: state.botUserId,
          eventId: state.pendingEventId,
        });
        await ctx.reply(
          `Спасибо! Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\n<b>ДД.ММ.ГГГГ ЧЧ:ММ</b>\n\nПример: <b>15.07.2025 09:00</b>`,
          { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } },
        );
      } else {
        await ctx.reply(
          `Спасибо! Теперь вы можете получать напоминания через кнопку «Напомнить» на сайте ${SITE_URL}`,
          { reply_markup: { remove_keyboard: true } },
        );
      }
      return;
    }

    if (state.step === 'awaitingReminderTime') {
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

      userState.delete(tgUserId);
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
    }
  });

  bot.command('unsubscribe', async (ctx) => {
    const externalId = String(ctx.from!.id);
    try {
      const res = await fetch(`${API_BASE}/broadcasts/unsubscribe`, {
        method: 'POST',
        headers: BOT_HEADERS,
        body: JSON.stringify({ channel: 'TELEGRAM', externalId }),
      });
      if (res.ok) {
        await ctx.reply('Вы отписались от информационных рассылок. Напоминания о мероприятиях продолжат приходить в обычном режиме.');
      } else {
        await ctx.reply('Не удалось обработать запрос. Попробуйте позже.');
      }
    } catch {
      await ctx.reply('Ошибка соединения. Попробуйте позже.');
    }
  });

  bot.catch((err) => { console.error('[telegram-bot] Error:', err); });
  bot.start();
}
