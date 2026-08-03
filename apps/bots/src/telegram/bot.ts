import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import {
  SITE_URL,
  buildReminderDateOptions,
  type ReminderDateOption,
} from '@ab-afisha/shared';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:3001';
const API_BASE = `${BACKEND_URL}/api`;
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN ?? '';
const BOT_HEADERS = { 'Content-Type': 'application/json', 'X-Bot-Internal-Token': BOT_TOKEN };

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

interface PublicEventSnapshot {
  id: string;
  title: string;
  startDate: string;
}

async function apiPublicEvent(eventId: string): Promise<PublicEventSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/events/public/${eventId}`);
    return res.ok ? (res.json() as Promise<PublicEventSnapshot>) : null;
  } catch {
    return null;
  }
}

type SaveResult = { ok: true } | { ok: false; duplicate: true } | { ok: false; duplicate: false };

async function saveReminder(botUserId: string, eventId: string, remindAt: string): Promise<SaveResult> {
  try {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({
        botUserId,
        eventId,
        remindAt,
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
  | {
      step: 'selectingReminderDates';
      botUserId: string;
      eventId: string;
      eventTitle: string;
      options: ReminderDateOption[];
      selected: Set<string>;
    };

const userState = new Map<number, UserState>();

type ReminderSelectionState = Extract<UserState, { step: 'selectingReminderDates' }>;

function reminderKeyboard(state: ReminderSelectionState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  state.options.forEach((option, index) => {
    const marker = state.selected.has(option.id) ? '☑️' : '⬜';
    keyboard.text(`${marker} ${option.label}`, `reminder_toggle:${index}`).row();
  });
  return keyboard.text(
    state.selected.size > 0 ? `Применить (${state.selected.size})` : 'Применить',
    'reminder_apply',
  );
}

async function showReminderDateSelector(
  tgUserId: number,
  botUserId: string,
  eventId: string,
  reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>,
): Promise<void> {
  const event = await apiPublicEvent(eventId);
  if (!event) {
    userState.delete(tgUserId);
    await reply('Мероприятие не найдено или уже снято с публикации.');
    return;
  }

  const options = buildReminderDateOptions(event.startDate);
  if (!options.length) {
    userState.delete(tgUserId);
    await reply('Для этого мероприятия уже нет доступных дат напоминания.');
    return;
  }

  const state: ReminderSelectionState = {
    step: 'selectingReminderDates',
    botUserId,
    eventId,
    eventTitle: event.title,
    options,
    selected: new Set<string>(),
  };
  userState.set(tgUserId, state);
  await reply(
    `Выберите одну или несколько дат напоминания для мероприятия «${event.title}».\n\nНапоминания будут отправлены в 09:00 МСК. После выбора нажмите «Применить».`,
    { reply_markup: reminderKeyboard(state) },
  );
}

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
    await showReminderDateSelector(tgUserId, user.id, pendingEventId, reply);
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
      `Чтобы получить напоминание о мероприятии:\n1. Перейди на сайт ${SITE_URL}\n2. Найди нужное мероприятие\n3. Нажми кнопку «Напомнить»\n4. Выбери «Телеграм»\n5. Отметь одну или несколько дат\n6. Нажми «Применить»`,
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
      await showReminderDateSelector(
        tgUserId,
        state.botUserId,
        state.pendingEventId,
        (text, opts) => ctx.reply(text, opts as any),
      );
    } else {
      await ctx.reply(
        `Привет! Я бот АБ Афиши Бухгалтера.\n\nИспользуй меня через кнопку «Напомнить» на сайте ${SITE_URL}`,
      );
    }
  });

  bot.callbackQuery(/^reminder_toggle:(\d+)$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminderDates') {
      await ctx.answerCallbackQuery({ text: 'Начните выбор заново через кнопку «Напомнить».' });
      return;
    }

    const index = Number(ctx.match[1]);
    const option = state.options[index];
    if (!option) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (state.selected.has(option.id)) state.selected.delete(option.id);
    else state.selected.add(option.id);

    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: reminderKeyboard(state) });
  });

  bot.callbackQuery('reminder_apply', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminderDates') {
      await ctx.answerCallbackQuery({ text: 'Начните выбор заново через кнопку «Напомнить».' });
      return;
    }

    const selected = state.options.filter((option) => state.selected.has(option.id));
    if (!selected.length) {
      await ctx.answerCallbackQuery({ text: 'Сначала выберите хотя бы одну дату.' });
      return;
    }

    await ctx.answerCallbackQuery({ text: 'Сохраняю напоминания…' });
    const results = await Promise.all(
      selected.map((option) => saveReminder(state.botUserId, state.eventId, option.remindAt)),
    );
    const failed = results.filter((result) => !result.ok && !result.duplicate);
    if (failed.length) {
      await ctx.reply(`Не удалось сохранить ${failed.length} напоминание(я). Попробуйте ещё раз позже.`);
      return;
    }

    userState.delete(ctx.from.id);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(
      `Готово! Напоминания для мероприятия «${state.eventTitle}» установлены на:\n\n` +
      selected.map((option) => `• ${option.label}, 09:00 МСК`).join('\n'),
    );
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
      await ctx.reply('Спасибо!', { reply_markup: { remove_keyboard: true } });
      await showReminderDateSelector(
        tgUserId,
        state.botUserId,
        state.pendingEventId,
        (text, opts) => ctx.reply(text, opts as any),
      );
    } else {
      await ctx.reply(
        `Спасибо! Теперь вы можете получать напоминания через кнопку «Напомнить» на сайте ${SITE_URL}`,
        { reply_markup: { remove_keyboard: true } },
      );
    }
  });

  // Text messages: phone input or a hint while the date selector is active
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
        await ctx.reply('Спасибо!', { reply_markup: { remove_keyboard: true } });
        await showReminderDateSelector(
          tgUserId,
          state.botUserId,
          state.pendingEventId,
          (text, opts) => ctx.reply(text, opts as any),
        );
      } else {
        await ctx.reply(
          `Спасибо! Теперь вы можете получать напоминания через кнопку «Напомнить» на сайте ${SITE_URL}`,
          { reply_markup: { remove_keyboard: true } },
        );
      }
      return;
    }

    if (state.step === 'selectingReminderDates') {
      await ctx.reply('Выберите даты с помощью кнопок выше, затем нажмите «Применить».');
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
