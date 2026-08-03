import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import {
  SITE_URL,
  adjustReminderTime,
  buildReminderCalendar,
  buildReminderDateTime,
  getInitialReminderMonth,
  shiftReminderMonth,
  type ReminderDateTimeOption,
} from '@ab-afisha/shared';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:3001';
const API_BASE = `${BACKEND_URL}/api`;
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN ?? '';
const BOT_HEADERS = { 'Content-Type': 'application/json', 'X-Bot-Internal-Token': BOT_TOKEN };
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

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
  startTime?: string | null;
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

type ReminderSelectionState = {
  step: 'selectingReminder';
  botUserId: string;
  eventId: string;
  eventTitle: string;
  eventStartDate: string;
  eventStartTime?: string | null;
  monthId: string;
  view: 'calendar' | 'time';
  pendingDate?: string;
  pendingTime: string;
  selected: Map<string, ReminderDateTimeOption>;
};

type UserState =
  | { step: 'awaitingLegal'; botUserId: string; pendingEventId?: string; allowMarketing: boolean }
  | { step: 'awaitingPhone'; botUserId: string; pendingEventId?: string }
  | ReminderSelectionState;

const userState = new Map<number, UserState>();

function selectedSummary(state: ReminderSelectionState): string {
  if (!state.selected.size) return 'Выбранных напоминаний пока нет.';
  return `Выбрано:\n${[...state.selected.values()]
    .sort((left, right) => left.remindAt.localeCompare(right.remindAt))
    .map((option) => `• ${option.label} МСК`)
    .join('\n')}`;
}

function calendarText(state: ReminderSelectionState): string {
  return (
    `Календарь напоминаний\n\n` +
    `Мероприятие: «${state.eventTitle}»\n\n` +
    `${selectedSummary(state)}\n\n` +
    'Выберите дату в календаре. Затем настройте время.'
  );
}

function timeText(state: ReminderSelectionState): string {
  return (
    `Настройка времени напоминания\n\n` +
    `Дата: ${state.pendingDate ?? 'не выбрана'}\n` +
    `Время: ${state.pendingTime} МСК\n\n` +
    'Измените время кнопками и нажмите «Добавить».'
  );
}

function calendarKeyboard(state: ReminderSelectionState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const calendar = buildReminderCalendar(state.eventStartDate, state.monthId);
  if (!calendar) return keyboard.text('Нет доступных дат', 'reminder_noop');

  keyboard
    .text(calendar.canGoPrevious ? '‹' : '·', calendar.canGoPrevious ? 'reminder_month:-1' : 'reminder_noop')
    .text(calendar.label, 'reminder_noop')
    .text(calendar.canGoNext ? '›' : '·', calendar.canGoNext ? 'reminder_month:1' : 'reminder_noop')
    .row();

  WEEKDAYS.forEach((weekday) => keyboard.text(weekday, 'reminder_noop'));
  keyboard.row();

  const selectedDates = new Set([...state.selected.values()].map((option) => option.dateId));
  calendar.weeks.forEach((week) => {
    week.forEach((cell) => {
      if (!cell.dateId || !cell.enabled || cell.day === null) {
        keyboard.text('·', 'reminder_noop');
        return;
      }
      const marker = selectedDates.has(cell.dateId) ? '✓' : '';
      keyboard.text(`${marker}${cell.day}`, `reminder_date:${cell.dateId}`);
    });
    keyboard.row();
  });

  if (state.selected.size) {
    keyboard
      .text(`Применить (${state.selected.size})`, 'reminder_apply')
      .text('Очистить', 'reminder_clear')
      .row();
  } else {
    keyboard.text('Выберите дату', 'reminder_noop').row();
  }

  return keyboard;
}

function timeKeyboard(state: ReminderSelectionState): InlineKeyboard {
  return new InlineKeyboard()
    .text('−1 ч', 'reminder_time:-60')
    .text(state.pendingTime, 'reminder_noop')
    .text('+1 ч', 'reminder_time:60')
    .row()
    .text('−15 мин', 'reminder_time:-15')
    .text('+15 мин', 'reminder_time:15')
    .row()
    .text('← Календарь', 'reminder_back')
    .text('Добавить', 'reminder_add')
    .row();
}

function selectorText(state: ReminderSelectionState): string {
  return state.view === 'time' ? timeText(state) : calendarText(state);
}

function selectorKeyboard(state: ReminderSelectionState): InlineKeyboard {
  return state.view === 'time' ? timeKeyboard(state) : calendarKeyboard(state);
}

async function showReminderSelector(
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

  const monthId = getInitialReminderMonth(event.startDate);
  if (!monthId) {
    userState.delete(tgUserId);
    await reply('Для этого мероприятия уже нет доступного времени для напоминания.');
    return;
  }

  const state: ReminderSelectionState = {
    step: 'selectingReminder',
    botUserId,
    eventId,
    eventTitle: event.title,
    eventStartDate: event.startDate,
    eventStartTime: event.startTime,
    monthId,
    view: 'calendar',
    pendingTime: '09:00',
    selected: new Map<string, ReminderDateTimeOption>(),
  };
  userState.set(tgUserId, state);
  await reply(selectorText(state), { reply_markup: selectorKeyboard(state) });
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

async function handleStart(
  tgUserId: number,
  username: string | undefined,
  firstName: string | undefined,
  payload: string,
  reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>,
) {
  const user = await apiBotUpsert(String(tgUserId), username, firstName);
  if (!user) {
    await reply('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
    return;
  }

  const pendingEventId = payload.startsWith('remind_')
    ? payload.replace('remind_', '').split('_')[0]
    : undefined;

  if (!user.legalAcceptedAt) {
    userState.set(tgUserId, {
      step: 'awaitingLegal',
      botUserId: user.id,
      pendingEventId,
      allowMarketing: user.allowMarketingMessages,
    });
    const keyboard = new InlineKeyboard().text('Принимаю', 'accept_legal');
    await reply(legalNoticeText(user.allowMarketingMessages), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: keyboard,
    });
    return;
  }

  const phoneRequired = await apiPhoneRequired();
  if (phoneRequired && !user.phone) {
    userState.set(tgUserId, { step: 'awaitingPhone', botUserId: user.id, pendingEventId });
    const keyboard = new Keyboard().requestContact('📱 Поделиться номером').resized().oneTime();
    await reply(
      'Для продолжения укажите номер телефона.\n\nНажмите кнопку «Поделиться номером» или введите его вручную в формате +7XXXXXXXXXX.',
      { reply_markup: keyboard },
    );
    return;
  }

  if (pendingEventId) {
    await showReminderSelector(tgUserId, user.id, pendingEventId, reply);
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
      `Чтобы получить напоминание о мероприятии:\n1. Перейдите на сайт ${SITE_URL}\n2. Найдите мероприятие\n3. Нажмите «Напомнить»\n4. Выберите Telegram\n5. Выберите дату в календаре\n6. Настройте время\n7. Добавьте одно или несколько напоминаний и нажмите «Применить»`,
    );
  });

  bot.callbackQuery('accept_legal', async (ctx) => {
    const tgUserId = ctx.from.id;
    const state = userState.get(tgUserId);
    if (!state || state.step !== 'awaitingLegal') {
      await ctx.answerCallbackQuery();
      return;
    }

    const accepted = await apiAcceptLegal(state.botUserId, state.allowMarketing);
    if (!accepted) {
      await ctx.answerCallbackQuery({ text: 'Не удалось сохранить согласие. Попробуйте ещё раз.' });
      return;
    }

    await ctx.answerCallbackQuery({ text: 'Согласие принято.' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });

    const phoneRequired = await apiPhoneRequired();
    if (phoneRequired) {
      userState.set(tgUserId, {
        step: 'awaitingPhone',
        botUserId: state.botUserId,
        pendingEventId: state.pendingEventId,
      });
      const keyboard = new Keyboard().requestContact('📱 Поделиться номером').resized().oneTime();
      await ctx.reply(
        'Для продолжения укажите номер телефона.\n\nНажмите «Поделиться номером» или введите +7XXXXXXXXXX.',
        { reply_markup: keyboard },
      );
      return;
    }

    userState.delete(tgUserId);
    if (state.pendingEventId) {
      await showReminderSelector(
        tgUserId,
        state.botUserId,
        state.pendingEventId,
        (text, opts) => ctx.reply(text, opts as any),
      );
    } else {
      await ctx.reply(
        `Привет! Я бот АБ Афиши Бухгалтера.\n\nИспользуйте меня через кнопку «Напомнить» на сайте ${SITE_URL}`,
      );
    }
  });

  bot.callbackQuery('reminder_noop', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^reminder_month:(-?1)$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery({ text: 'Откройте выбор напоминания заново.' });
      return;
    }

    const monthId = shiftReminderMonth(state.monthId, Number(ctx.match[1]), state.eventStartDate);
    if (monthId) state.monthId = monthId;
    state.view = 'calendar';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery(/^reminder_date:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery({ text: 'Откройте выбор напоминания заново.' });
      return;
    }

    state.pendingDate = ctx.match[1];
    state.pendingTime = '09:00';
    state.view = 'time';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery(/^reminder_time:(-?\d+)$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder' || state.view !== 'time') {
      await ctx.answerCallbackQuery({ text: 'Сначала выберите дату.' });
      return;
    }

    state.pendingTime = adjustReminderTime(state.pendingTime, Number(ctx.match[1]));
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_back', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    state.view = 'calendar';
    state.pendingDate = undefined;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_add', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder' || !state.pendingDate) {
      await ctx.answerCallbackQuery({ text: 'Сначала выберите дату.' });
      return;
    }

    const option = buildReminderDateTime(
      state.pendingDate,
      state.pendingTime,
      state.eventStartDate,
      state.eventStartTime,
    );
    if (!option) {
      await ctx.answerCallbackQuery({ text: 'Выберите будущее время до начала мероприятия.' });
      return;
    }

    state.selected.set(option.id, option);
    state.view = 'calendar';
    state.pendingDate = undefined;
    await ctx.answerCallbackQuery({ text: 'Напоминание добавлено.' });
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_clear', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    state.selected.clear();
    state.view = 'calendar';
    await ctx.answerCallbackQuery({ text: 'Выбор очищен.' });
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_apply', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery({ text: 'Откройте выбор напоминания заново.' });
      return;
    }

    const selected = [...state.selected.values()]
      .sort((left, right) => left.remindAt.localeCompare(right.remindAt));
    if (!selected.length) {
      await ctx.answerCallbackQuery({ text: 'Сначала добавьте хотя бы одно напоминание.' });
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
      selected.map((option) => `• ${option.label} МСК`).join('\n'),
    );
  });

  bot.on('message:contact', async (ctx) => {
    const tgUserId = ctx.from.id;
    const state = userState.get(tgUserId);
    if (!state || state.step !== 'awaitingPhone') return;

    const phone = ctx.message.contact.phone_number;
    await apiSavePhone(state.botUserId, phone);
    userState.delete(tgUserId);

    if (state.pendingEventId) {
      await ctx.reply('Спасибо!', { reply_markup: { remove_keyboard: true } });
      await showReminderSelector(
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

  bot.on('message:text', async (ctx, next) => {
    if (ctx.message.text.startsWith('/')) {
      await next();
      return;
    }

    const tgUserId = ctx.from.id;
    const state = userState.get(tgUserId);
    if (!state) return;

    if (state.step === 'awaitingPhone') {
      const raw = ctx.message.text.trim();
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
        await showReminderSelector(
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

    if (state.step === 'selectingReminder') {
      await ctx.reply('Используйте календарь и кнопки настройки времени выше.');
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
