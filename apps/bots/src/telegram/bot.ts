import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import {
  SITE_URL,
  buildReminderCalendar,
  buildReminderDateTime,
  formatReminderDateLabel,
  getAvailableReminderHours,
  getAvailableReminderMinutes,
  getInitialReminderMonth,
  getReminderEventDeadline,
  shiftReminderMonth,
  type ReminderDateTimeOption,
} from '@ab-afisha/shared';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:3001';
const API_BASE = `${BACKEND_URL}/api`;
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN ?? '';
const BOT_HEADERS = { 'Content-Type': 'application/json', 'X-Bot-Internal-Token': BOT_TOKEN };
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

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

type ReminderSelectionState = {
  step: 'selectingReminder';
  botUserId: string;
  eventId: string;
  eventTitle: string;
  eventStartDate: string;
  eventStartTime?: string | null;
  monthId: string;
  view: 'calendar' | 'hour' | 'minute' | 'selected';
  pendingDate?: string;
  pendingHour?: string;
  selected: Map<string, ReminderDateTimeOption>;
};

type UserState =
  | { step: 'awaitingLegal'; botUserId: string; pendingEventId?: string; allowMarketing: boolean }
  | { step: 'awaitingPhone'; botUserId: string; pendingEventId?: string }
  | ReminderSelectionState;

const userState = new Map<number, UserState>();

function sortedSelected(state: ReminderSelectionState): ReminderDateTimeOption[] {
  return [...state.selected.values()]
    .sort((left, right) => left.remindAt.localeCompare(right.remindAt));
}

function compactOptionLabel(option: ReminderDateTimeOption): string {
  const [, month, day] = option.dateId.split('-');
  return `${day}.${month} ${option.time}`;
}

function selectedSummary(state: ReminderSelectionState): string {
  const selected = sortedSelected(state);
  if (!selected.length) return 'Выбранных напоминаний пока нет.';
  return `Выбрано (${selected.length}):\n${selected
    .map((option) => `• ${option.label} МСК`)
    .join('\n')}`;
}

function selectedTimesForDate(state: ReminderSelectionState, dateId: string): string {
  const times = sortedSelected(state)
    .filter((option) => option.dateId === dateId)
    .map((option) => option.time);
  return times.length ? times.join(', ') : 'нет';
}

function calendarText(state: ReminderSelectionState): string {
  return (
    `Календарь напоминаний\n\n` +
    `Мероприятие: «${state.eventTitle}»\n\n` +
    `${selectedSummary(state)}\n\n` +
    'Выберите дату. После этого выберите час и минуты.'
  );
}

function hourText(state: ReminderSelectionState): string {
  const dateLabel = state.pendingDate
    ? formatReminderDateLabel(state.pendingDate) ?? state.pendingDate
    : 'не выбрана';
  return (
    `Выбор часа\n\n` +
    `Дата: ${dateLabel}\n` +
    `Уже выбрано на эту дату: ${state.pendingDate ? selectedTimesForDate(state, state.pendingDate) : 'нет'}\n\n` +
    'Выберите час напоминания (МСК).'
  );
}

function minuteText(state: ReminderSelectionState): string {
  const dateLabel = state.pendingDate
    ? formatReminderDateLabel(state.pendingDate) ?? state.pendingDate
    : 'не выбрана';
  return (
    `Выбор минут\n\n` +
    `Дата: ${dateLabel}\n` +
    `Час: ${state.pendingHour ?? '--'}\n\n` +
    'Выберите минуты. Время сразу добавится в список.'
  );
}

function selectedText(state: ReminderSelectionState): string {
  return (
    `Выбранные напоминания\n\n` +
    `Мероприятие: «${state.eventTitle}»\n\n` +
    `${selectedSummary(state)}\n\n` +
    'Нажмите на время с ✕, чтобы удалить только его.'
  );
}

function addGrid(
  keyboard: InlineKeyboard,
  values: readonly string[],
  columns: number,
  callback: (value: string) => string,
): void {
  values.forEach((value, index) => {
    keyboard.text(value, callback(value));
    if ((index + 1) % columns === 0) keyboard.row();
  });
  if (values.length % columns !== 0) keyboard.row();
}

function calendarKeyboard(state: ReminderSelectionState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const calendar = buildReminderCalendar(state.eventStartDate, state.monthId);
  if (!calendar) {
    return keyboard
      .text('Нет доступных дат', 'reminder_noop')
      .row()
      .text('Отмена', 'reminder_cancel');
  }

  keyboard
    .text(calendar.canGoPrevious ? '‹' : '·', calendar.canGoPrevious ? 'reminder_month:-1' : 'reminder_noop')
    .text(calendar.label, 'reminder_noop')
    .text(calendar.canGoNext ? '›' : '·', calendar.canGoNext ? 'reminder_month:1' : 'reminder_noop')
    .row();

  WEEKDAYS.forEach((weekday) => keyboard.text(weekday, 'reminder_noop'));
  keyboard.row();

  const selectedDates = new Set(sortedSelected(state).map((option) => option.dateId));
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
      .text(`Выбранные (${state.selected.size})`, 'reminder_selected')
      .row()
      .text('Очистить', 'reminder_clear')
      .text('Отмена', 'reminder_cancel')
      .row();
  } else {
    keyboard.text('Отмена', 'reminder_cancel').row();
  }

  return keyboard;
}

function hourKeyboard(state: ReminderSelectionState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  if (!state.pendingDate) {
    return keyboard.text('← Календарь', 'reminder_back');
  }

  const hours = getAvailableReminderHours(
    state.pendingDate,
    state.eventStartDate,
    state.eventStartTime,
  );
  addGrid(keyboard, hours, 4, (hour) => `reminder_hour:${hour}`);

  keyboard.text('← Календарь', 'reminder_back');
  if (state.selected.size) keyboard.text(`Выбранные (${state.selected.size})`, 'reminder_selected');
  keyboard.row().text('Отмена', 'reminder_cancel').row();
  return keyboard;
}

function minuteKeyboard(state: ReminderSelectionState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  if (!state.pendingDate || !state.pendingHour) {
    return keyboard.text('← Календарь', 'reminder_back');
  }

  const minutes = getAvailableReminderMinutes(
    state.pendingDate,
    state.pendingHour,
    state.eventStartDate,
    state.eventStartTime,
  );
  addGrid(keyboard, minutes, 4, (minute) => `reminder_minute:${minute}`);

  keyboard
    .text('← Часы', 'reminder_hours_back')
    .text('← Календарь', 'reminder_back')
    .row();
  if (state.selected.size) {
    keyboard.text(`Выбранные (${state.selected.size})`, 'reminder_selected').row();
  }
  keyboard.text('Отмена', 'reminder_cancel').row();
  return keyboard;
}

function selectedKeyboard(state: ReminderSelectionState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const option of sortedSelected(state)) {
    keyboard.text(`✕ ${compactOptionLabel(option)}`, `reminder_remove:${option.id}`).row();
  }
  keyboard.text('← Календарь', 'reminder_back');
  if (state.selected.size) keyboard.text(`Применить (${state.selected.size})`, 'reminder_apply');
  keyboard.row();
  if (state.selected.size) keyboard.text('Очистить', 'reminder_clear');
  keyboard.text('Отмена', 'reminder_cancel').row();
  return keyboard;
}

function selectorText(state: ReminderSelectionState): string {
  if (state.view === 'hour') return hourText(state);
  if (state.view === 'minute') return minuteText(state);
  if (state.view === 'selected') return selectedText(state);
  return calendarText(state);
}

function selectorKeyboard(state: ReminderSelectionState): InlineKeyboard {
  if (state.view === 'hour') return hourKeyboard(state);
  if (state.view === 'minute') return minuteKeyboard(state);
  if (state.view === 'selected') return selectedKeyboard(state);
  return calendarKeyboard(state);
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

  const deadline = getReminderEventDeadline(event.startDate, event.startTime);
  const monthId = getInitialReminderMonth(event.startDate);
  if (!deadline || deadline.getTime() <= Date.now() || !monthId) {
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
    selected: new Map<string, ReminderDateTimeOption>(),
  };
  userState.set(tgUserId, state);
  await reply(selectorText(state), { reply_markup: selectorKeyboard(state) });
}

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
      `Привет! Я бот АБ Афиши Бухгалтера.\n\nЯ помогу напомнить о предстоящих мероприятиях для бухгалтеров.\n\nИспользуйте меня через кнопку «Напомнить» на сайте ${SITE_URL}`,
    );
  }
}

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
      `Чтобы получить напоминание о мероприятии:\n1. Перейдите на сайт ${SITE_URL}\n2. Найдите мероприятие\n3. Нажмите «Напомнить»\n4. Выберите Telegram\n5. Выберите дату в календаре\n6. Выберите час и минуты\n7. Добавьте одно или несколько времён и дат\n8. Нажмите «Применить»`,
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
    state.pendingDate = undefined;
    state.pendingHour = undefined;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery(/^reminder_date:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery({ text: 'Откройте выбор напоминания заново.' });
      return;
    }

    const dateId = ctx.match[1];
    const hours = getAvailableReminderHours(dateId, state.eventStartDate, state.eventStartTime);
    if (!hours.length) {
      await ctx.answerCallbackQuery({ text: 'На эту дату уже нет доступного времени.' });
      return;
    }

    state.pendingDate = dateId;
    state.pendingHour = undefined;
    state.view = 'hour';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery(/^reminder_hour:(\d{2})$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder' || !state.pendingDate) {
      await ctx.answerCallbackQuery({ text: 'Сначала выберите дату.' });
      return;
    }

    const hour = ctx.match[1];
    const minutes = getAvailableReminderMinutes(
      state.pendingDate,
      hour,
      state.eventStartDate,
      state.eventStartTime,
    );
    if (!minutes.length) {
      await ctx.answerCallbackQuery({ text: 'В этом часу уже нет доступного времени.' });
      return;
    }

    state.pendingHour = hour;
    state.view = 'minute';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery(/^reminder_minute:(\d{2})$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (
      !state ||
      state.step !== 'selectingReminder' ||
      !state.pendingDate ||
      !state.pendingHour
    ) {
      await ctx.answerCallbackQuery({ text: 'Сначала выберите дату и час.' });
      return;
    }

    const option = buildReminderDateTime(
      state.pendingDate,
      `${state.pendingHour}:${ctx.match[1]}`,
      state.eventStartDate,
      state.eventStartTime,
    );
    if (!option) {
      await ctx.answerCallbackQuery({ text: 'Это время уже недоступно. Выберите другое.' });
      return;
    }

    const duplicate = state.selected.has(option.id);
    state.selected.set(option.id, option);
    state.pendingHour = undefined;
    state.view = 'hour';
    await ctx.answerCallbackQuery({ text: duplicate ? 'Это время уже выбрано.' : 'Напоминание добавлено.' });
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_hours_back', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    state.pendingHour = undefined;
    state.view = state.pendingDate ? 'hour' : 'calendar';
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
    state.pendingHour = undefined;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_selected', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    state.view = 'selected';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery(/^reminder_remove:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/, async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    const removed = state.selected.delete(ctx.match[1]);
    state.view = state.selected.size ? 'selected' : 'calendar';
    await ctx.answerCallbackQuery({ text: removed ? 'Напоминание удалено.' : 'Уже удалено.' });
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_clear', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    state.selected.clear();
    state.pendingDate = undefined;
    state.pendingHour = undefined;
    state.view = 'calendar';
    await ctx.answerCallbackQuery({ text: 'Выбор очищен.' });
    await ctx.editMessageText(selectorText(state), { reply_markup: selectorKeyboard(state) });
  });

  bot.callbackQuery('reminder_cancel', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery();
      return;
    }
    userState.delete(ctx.from.id);
    await ctx.answerCallbackQuery({ text: 'Выбор отменён.' });
    await ctx.editMessageText('Выбор напоминаний отменён. Вернуться к нему можно через кнопку «Напомнить» на сайте.');
  });

  bot.callbackQuery('reminder_apply', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'selectingReminder') {
      await ctx.answerCallbackQuery({ text: 'Откройте выбор напоминания заново.' });
      return;
    }

    const selected = sortedSelected(state);
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
      await ctx.reply(`Не удалось сохранить ${failed.length} напоминание(я). Проверьте время и попробуйте ещё раз.`);
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
      await ctx.reply('Используйте календарь и кнопки выбора часа и минут выше.');
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
