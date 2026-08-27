import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { PrismaService } from '../../common/prisma/prisma.service';
import { BotsService } from '../bots/bots.service';
import { RemindersService } from '../reminders/reminders.service';
import {
  normalizeMaxUpdate,
  type MaxBotStartedUpdate,
  type MaxMessageCallbackUpdate,
  type MaxMessageCreatedUpdate,
  type MaxUser,
} from './max-api.types';

const MAX_API = 'https://platform-api2.max.ru';
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

interface MaxButton {
  type: 'callback';
  text: string;
  payload: string;
}

interface MaxKeyboardAttachment {
  type: 'inline_keyboard';
  payload: { buttons: MaxButton[][] };
}

type MaxReminderState = {
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

type MaxUserState =
  | { step: 'awaitingLegal'; botUserId: string; pendingEventId?: string; allowMarketing: boolean }
  | { step: 'awaitingPhone'; botUserId: string; pendingEventId?: string }
  | MaxReminderState;

type MaxLegalState = Extract<MaxUserState, { step: 'awaitingLegal' }>;

@Injectable()
export class MaxBotInteractionService {
  private readonly logger = new Logger(MaxBotInteractionService.name);
  private readonly states = new Map<number, MaxUserState>();

  constructor(
    private readonly bots: BotsService,
    private readonly reminders: RemindersService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async processWebhookUpdate(raw: unknown): Promise<boolean> {
    const update = normalizeMaxUpdate(raw);
    if (!update) return false;

    if (update.updateType === 'bot_started') {
      await this.handleStart(update as MaxBotStartedUpdate);
      return true;
    }

    if (update.updateType === 'message_callback') {
      await this.handleCallback(update as MaxMessageCallbackUpdate);
      return true;
    }

    if (update.updateType === 'message_created') {
      return this.handleMessage(update as MaxMessageCreatedUpdate);
    }

    return false;
  }

  private async handleStart(update: MaxBotStartedUpdate): Promise<void> {
    await this.startForUser(update.user, update.payload ?? '');
  }

  private async startForUser(user: MaxUser, payload: string): Promise<void> {
    const snapshot = await this.bots.upsertBotUser({
      channel: 'MAX',
      externalId: String(user.userId),
      username: user.username,
      firstName: user.name,
    });
    const pendingEventId = this.eventIdFromPayload(payload);

    if (!snapshot.legalAcceptedAt) {
      this.states.set(user.userId, {
        step: 'awaitingLegal',
        botUserId: snapshot.id,
        pendingEventId,
        allowMarketing: snapshot.allowMarketingMessages,
      });
      await this.sendMessage(
        user.userId,
        this.legalNotice(snapshot.allowMarketingMessages),
        this.legalKeyboard(),
      );
      return;
    }

    if (await this.bots.isPhoneRequired() && !snapshot.phone) {
      this.states.set(user.userId, {
        step: 'awaitingPhone',
        botUserId: snapshot.id,
        pendingEventId,
      });
      await this.sendMessage(user.userId, 'Для продолжения укажите номер телефона в формате +7XXXXXXXXXX.');
      return;
    }

    if (pendingEventId) {
      await this.showReminderSelector(user.userId, snapshot.id, pendingEventId);
      return;
    }

    await this.sendWelcome(user.userId);
  }

  private async handleMessage(update: MaxMessageCreatedUpdate): Promise<boolean> {
    const sender = update.message.sender;
    const text = update.message.body.text?.trim();
    if (!sender || !text) return false;

    if (text.startsWith('/start')) {
      const payload = text.slice('/start'.length).trim();
      await this.startForUser(sender, payload);
      return true;
    }

    if (text.toLocaleLowerCase('ru-RU') === '/unsubscribe') {
      const unsubscribed = await this.bots.unsubscribeMarketing('MAX', String(sender.userId));
      await this.sendMessage(
        sender.userId,
        unsubscribed
          ? 'Вы отписались от информационных рассылок. Напоминания о мероприятиях продолжат приходить.'
          : 'Пользователь не найден. Откройте бота заново и повторите команду.',
      );
      return true;
    }

    const state = this.states.get(sender.userId);
    if (!state) return false;

    if (state.step === 'awaitingLegal') {
      const normalized = text.toLocaleLowerCase('ru-RU');
      if (normalized !== 'принимаю' && normalized !== 'принять') {
        await this.sendMessage(
          sender.userId,
          'Нажмите кнопку «Принять», чтобы продолжить.',
          this.legalKeyboard(),
        );
        return true;
      }
      await this.completeLegalAcceptance(sender.userId, state);
      return true;
    }

    if (state.step === 'awaitingPhone') {
      const phone = this.normalizePhone(text);
      if (!phone) {
        await this.sendMessage(sender.userId, 'Не удалось распознать номер. Введите его в формате +7XXXXXXXXXX.');
        return true;
      }
      await this.bots.savePhone(state.botUserId, phone);
      this.states.delete(sender.userId);
      if (state.pendingEventId) {
        await this.showReminderSelector(sender.userId, state.botUserId, state.pendingEventId);
      } else {
        await this.sendMessage(sender.userId, `Спасибо! Теперь можно использовать кнопку «Напомнить» на сайте ${SITE_URL}`);
      }
      return true;
    }

    await this.sendMessage(sender.userId, 'Используйте календарь и кнопки выбора часа и минут.');
    return true;
  }

  private async handleCallback(update: MaxMessageCallbackUpdate): Promise<void> {
    const user = update.callback.user ?? update.user ?? update.message?.sender;
    if (!user) return;

    const payload = update.callback.payload ?? '';
    const state = this.states.get(user.userId);

    if (payload === 'accept_legal') {
      if (!state || state.step !== 'awaitingLegal') {
        await this.answerCallback(
          update.callback.callbackId,
          undefined,
          undefined,
          'Согласие уже принято. Откройте напоминание заново на сайте.',
        );
        return;
      }
      await this.completeLegalAcceptance(user.userId, state, update.callback.callbackId);
      return;
    }

    if (payload === 'reminder_noop') {
      await this.answerCallback(update.callback.callbackId);
      return;
    }

    if (!state || state.step !== 'selectingReminder') {
      await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Откройте выбор напоминания заново.');
      return;
    }

    const monthMatch = /^reminder_month:(-?1)$/.exec(payload);
    if (monthMatch) {
      const monthId = shiftReminderMonth(
        state.monthId,
        Number(monthMatch[1]),
        state.eventStartDate,
      );
      if (monthId) state.monthId = monthId;
      state.view = 'calendar';
      state.pendingDate = undefined;
      state.pendingHour = undefined;
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    const dateMatch = /^reminder_date:(\d{4}-\d{2}-\d{2})$/.exec(payload);
    if (dateMatch) {
      const dateId = dateMatch[1];
      const hours = getAvailableReminderHours(
        dateId,
        state.eventStartDate,
        state.eventStartTime,
      );
      if (!hours.length) {
        await this.answerCallback(update.callback.callbackId, undefined, undefined, 'На эту дату уже нет доступного времени.');
        return;
      }
      state.pendingDate = dateId;
      state.pendingHour = undefined;
      state.view = 'hour';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    const hourMatch = /^reminder_hour:(\d{2})$/.exec(payload);
    if (hourMatch) {
      if (!state.pendingDate) {
        await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Сначала выберите дату.');
        return;
      }
      const hour = hourMatch[1];
      const minutes = getAvailableReminderMinutes(
        state.pendingDate,
        hour,
        state.eventStartDate,
        state.eventStartTime,
      );
      if (!minutes.length) {
        await this.answerCallback(update.callback.callbackId, undefined, undefined, 'В этом часу уже нет доступного времени.');
        return;
      }
      state.pendingHour = hour;
      state.view = 'minute';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    const minuteMatch = /^reminder_minute:(\d{2})$/.exec(payload);
    if (minuteMatch) {
      if (!state.pendingDate || !state.pendingHour) {
        await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Сначала выберите дату и час.');
        return;
      }
      const option = buildReminderDateTime(
        state.pendingDate,
        `${state.pendingHour}:${minuteMatch[1]}`,
        state.eventStartDate,
        state.eventStartTime,
      );
      if (!option) {
        await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Это время уже недоступно. Выберите другое.');
        return;
      }
      const duplicate = state.selected.has(option.id);
      state.selected.set(option.id, option);
      state.view = 'minute';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
        duplicate ? 'Это время уже выбрано.' : 'Напоминание добавлено.',
      );
      return;
    }

    if (payload === 'reminder_hours_back') {
      state.pendingHour = undefined;
      state.view = state.pendingDate ? 'hour' : 'calendar';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    if (payload === 'reminder_back') {
      state.view = 'calendar';
      state.pendingDate = undefined;
      state.pendingHour = undefined;
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    if (payload === 'reminder_selected') {
      state.view = 'selected';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    const removeMatch = /^reminder_remove:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/.exec(payload);
    if (removeMatch) {
      const removed = state.selected.delete(removeMatch[1]);
      state.view = state.selected.size ? 'selected' : 'calendar';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
        removed ? 'Напоминание удалено.' : 'Уже удалено.',
      );
      return;
    }

    if (payload === 'reminder_clear') {
      state.selected.clear();
      state.pendingDate = undefined;
      state.pendingHour = undefined;
      state.view = 'calendar';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
        'Выбор очищен.',
      );
      return;
    }

    if (payload === 'reminder_cancel') {
      this.states.delete(user.userId);
      await this.answerCallback(
        update.callback.callbackId,
        'Выбор напоминаний отменён. Вернуться к нему можно через кнопку «Напомнить» на сайте.',
      );
      return;
    }

    if (payload !== 'reminder_apply') return;

    const selected = this.sortedSelected(state);
    if (!selected.length) {
      await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Сначала добавьте напоминание.');
      return;
    }

    let failed = 0;
    for (const option of selected) {
      try {
        await this.reminders.create({
          botUserId: state.botUserId,
          eventId: state.eventId,
          remindAt: option.remindAt,
          timezone: 'Europe/Moscow',
        });
      } catch (error) {
        if (!(error instanceof ConflictException)) failed += 1;
      }
    }

    if (failed) {
      await this.answerCallback(update.callback.callbackId, undefined, undefined, `Не удалось сохранить ${failed} напоминание(я). Проверьте время и попробуйте ещё раз.`);
      return;
    }

    this.states.delete(user.userId);
    await this.answerCallback(
      update.callback.callbackId,
      `Готово! Напоминания для мероприятия «${state.eventTitle}» установлены на:\n\n` +
        selected.map((option) => `• ${option.label} МСК`).join('\n'),
    );
  }

  private async completeLegalAcceptance(
    userId: number,
    state: MaxLegalState,
    callbackId?: string,
  ): Promise<void> {
    await this.bots.acceptLegal(state.botUserId, state.allowMarketing);
    this.states.delete(userId);

    if (callbackId) {
      await this.answerCallback(callbackId, 'Согласие принято.');
    } else {
      await this.sendMessage(userId, 'Согласие принято.');
    }

    if (await this.bots.isPhoneRequired()) {
      this.states.set(userId, {
        step: 'awaitingPhone',
        botUserId: state.botUserId,
        pendingEventId: state.pendingEventId,
      });
      await this.sendMessage(userId, 'Укажите номер телефона в формате +7XXXXXXXXXX.');
      return;
    }

    if (state.pendingEventId) {
      await this.showReminderSelector(userId, state.botUserId, state.pendingEventId);
      return;
    }

    await this.sendWelcome(userId);
  }

  private async sendWelcome(userId: number): Promise<void> {
    await this.sendMessage(
      userId,
      `Привет! Я бот АБ Афиши Бухгалтера. Используйте кнопку «Напомнить» на сайте ${SITE_URL}`,
    );
  }

  private async showReminderSelector(userId: number, botUserId: string, eventId: string): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: 'PUBLISHED' },
      select: { title: true, startDate: true, startTime: true },
    });
    if (!event) {
      this.states.delete(userId);
      await this.sendMessage(userId, 'Мероприятие не найдено или уже снято с публикации.');
      return;
    }

    const deadline = getReminderEventDeadline(event.startDate, event.startTime);
    const monthId = getInitialReminderMonth(event.startDate);
    if (!deadline || deadline.getTime() <= Date.now() || !monthId) {
      this.states.delete(userId);
      await this.sendMessage(userId, 'Для этого мероприятия уже нет доступного времени для напоминания.');
      return;
    }

    const state: MaxReminderState = {
      step: 'selectingReminder',
      botUserId,
      eventId,
      eventTitle: event.title,
      eventStartDate: event.startDate.toISOString(),
      eventStartTime: event.startTime,
      monthId,
      view: 'calendar',
      selected: new Map<string, ReminderDateTimeOption>(),
    };
    this.states.set(userId, state);
    await this.sendMessage(userId, this.selectorText(state), this.selectorKeyboard(state));
  }

  private sortedSelected(state: MaxReminderState): ReminderDateTimeOption[] {
    return [...state.selected.values()]
      .sort((left, right) => left.remindAt.localeCompare(right.remindAt));
  }

  private compactOptionLabel(option: ReminderDateTimeOption): string {
    const [, month, day] = option.dateId.split('-');
    return `${day}.${month} ${option.time}`;
  }

  private selectedSummary(state: MaxReminderState): string {
    const selected = this.sortedSelected(state);
    if (!selected.length) return 'Выбранных напоминаний пока нет.';
    return `Выбрано (${selected.length}):\n${selected
      .map((option) => `• ${option.label} МСК`)
      .join('\n')}`;
  }

  private selectedTimesForDate(state: MaxReminderState, dateId: string): string {
    const times = this.sortedSelected(state)
      .filter((option) => option.dateId === dateId)
      .map((option) => option.time);
    return times.length ? times.join(', ') : 'нет';
  }

  private selectedTimesForHour(state: MaxReminderState, dateId: string, hour: string): string {
    const times = this.sortedSelected(state)
      .filter((option) => option.dateId === dateId && option.time.startsWith(`${hour}:`))
      .map((option) => `✓ ${option.time}`);
    return times.length ? times.join(', ') : 'нет';
  }

  private selectorText(state: MaxReminderState): string {
    if (state.view === 'hour') {
      const dateLabel = state.pendingDate
        ? formatReminderDateLabel(state.pendingDate) ?? state.pendingDate
        : 'не выбрана';
      return (
        `Выбор часа\n\n` +
        `Дата: ${dateLabel}\n` +
        `Уже выбрано на эту дату: ${state.pendingDate ? this.selectedTimesForDate(state, state.pendingDate) : 'нет'}\n\n` +
        'Выберите час напоминания (МСК).'
      );
    }

    if (state.view === 'minute') {
      const dateLabel = state.pendingDate
        ? formatReminderDateLabel(state.pendingDate) ?? state.pendingDate
        : 'не выбрана';
      const selectedInHour = state.pendingDate && state.pendingHour
        ? this.selectedTimesForHour(state, state.pendingDate, state.pendingHour)
        : 'нет';
      return (
        `Выбор минут\n\n` +
        `Дата: ${dateLabel}\n` +
        `Час: ${state.pendingHour ?? '--'}\n` +
        `Уже выбрано в этом часу: ${selectedInHour}\n\n` +
        'Выберите минуты. Время сразу добавится в список, и можно выбрать следующую минуту этого же часа.'
      );
    }

    if (state.view === 'selected') {
      return (
        `Выбранные напоминания\n\n` +
        `Мероприятие: «${state.eventTitle}»\n\n` +
        `${this.selectedSummary(state)}\n\n` +
        'Нажмите на время с ✕, чтобы удалить только его.'
      );
    }

    return (
      `Календарь напоминаний\n\n` +
      `Мероприятие: «${state.eventTitle}»\n\n` +
      `${this.selectedSummary(state)}\n\n` +
      'Выберите дату. После этого выберите час и минуты.'
    );
  }

  private selectorKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    if (state.view === 'hour') return this.hourKeyboard(state);
    if (state.view === 'minute') return this.minuteKeyboard(state);
    if (state.view === 'selected') return this.selectedKeyboard(state);
    return this.calendarKeyboard(state);
  }

  private calendarKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    const calendar = buildReminderCalendar(state.eventStartDate, state.monthId);
    if (!calendar) {
      return {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [this.button('Нет доступных дат', 'reminder_noop')],
            [this.button('Отмена', 'reminder_cancel')],
          ],
        },
      };
    }

    const buttons: MaxButton[][] = [[
      this.button(calendar.canGoPrevious ? '‹' : '·', calendar.canGoPrevious ? 'reminder_month:-1' : 'reminder_noop'),
      this.button(calendar.label, 'reminder_noop'),
      this.button(calendar.canGoNext ? '›' : '·', calendar.canGoNext ? 'reminder_month:1' : 'reminder_noop'),
    ]];

    buttons.push(WEEKDAYS.map((weekday) => this.button(weekday, 'reminder_noop')));

    const selectedDates = new Set(this.sortedSelected(state).map((option) => option.dateId));
    calendar.weeks.forEach((week) => {
      buttons.push(week.map((cell) => {
        if (!cell.dateId || !cell.enabled || cell.day === null) {
          return this.button('·', 'reminder_noop');
        }
        const marker = selectedDates.has(cell.dateId) ? '✓' : '';
        return this.button(`${marker}${cell.day}`, `reminder_date:${cell.dateId}`);
      }));
    });

    if (state.selected.size) {
      buttons.push([
        this.button(`Применить (${state.selected.size})`, 'reminder_apply'),
        this.button(`Выбранные (${state.selected.size})`, 'reminder_selected'),
      ]);
      buttons.push([
        this.button('Очистить', 'reminder_clear'),
        this.button('Отмена', 'reminder_cancel'),
      ]);
    } else {
      buttons.push([this.button('Отмена', 'reminder_cancel')]);
    }

    return { type: 'inline_keyboard', payload: { buttons } };
  }

  private hourKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    const buttons: MaxButton[][] = [];
    if (state.pendingDate) {
      const hours = getAvailableReminderHours(
        state.pendingDate,
        state.eventStartDate,
        state.eventStartTime,
      );
      this.pushGrid(buttons, hours, 4, (hour) => this.button(hour, `reminder_hour:${hour}`));
    }

    const navigation = [this.button('← Календарь', 'reminder_back')];
    if (state.selected.size) {
      navigation.push(this.button(`Выбранные (${state.selected.size})`, 'reminder_selected'));
    }
    buttons.push(navigation);
    buttons.push([this.button('Отмена', 'reminder_cancel')]);
    return { type: 'inline_keyboard', payload: { buttons } };
  }

  private minuteKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    const buttons: MaxButton[][] = [];
    if (state.pendingDate && state.pendingHour) {
      const minutes = getAvailableReminderMinutes(
        state.pendingDate,
        state.pendingHour,
        state.eventStartDate,
        state.eventStartTime,
      );
      this.pushGrid(buttons, minutes, 4, (minute) => this.button(minute, `reminder_minute:${minute}`));
    }

    buttons.push([
      this.button('← Часы', 'reminder_hours_back'),
      this.button('← Календарь', 'reminder_back'),
    ]);
    if (state.selected.size) {
      buttons.push([this.button(`Выбранные (${state.selected.size})`, 'reminder_selected')]);
    }
    buttons.push([this.button('Отмена', 'reminder_cancel')]);
    return { type: 'inline_keyboard', payload: { buttons } };
  }

  private selectedKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    const buttons: MaxButton[][] = this.sortedSelected(state).map((option) => [
      this.button(`✕ ${this.compactOptionLabel(option)}`, `reminder_remove:${option.id}`),
    ]);

    const navigation = [this.button('← Календарь', 'reminder_back')];
    if (state.selected.size) {
      navigation.push(this.button(`Применить (${state.selected.size})`, 'reminder_apply'));
    }
    buttons.push(navigation);

    const finalRow: MaxButton[] = [];
    if (state.selected.size) finalRow.push(this.button('Очистить', 'reminder_clear'));
    finalRow.push(this.button('Отмена', 'reminder_cancel'));
    buttons.push(finalRow);

    return { type: 'inline_keyboard', payload: { buttons } };
  }

  private pushGrid(
    rows: MaxButton[][],
    values: readonly string[],
    columns: number,
    makeButton: (value: string) => MaxButton,
  ): void {
    for (let index = 0; index < values.length; index += columns) {
      rows.push(values.slice(index, index + columns).map(makeButton));
    }
  }

  private button(text: string, payload: string): MaxButton {
    return { type: 'callback', text, payload };
  }

  private legalKeyboard(): MaxKeyboardAttachment {
    return {
      type: 'inline_keyboard',
      payload: { buttons: [[this.button('Принять', 'accept_legal')]] },
    };
  }

  private async sendMessage(userId: number, text: string, keyboard?: MaxKeyboardAttachment): Promise<void> {
    await this.maxRequest(`/messages?user_id=${encodeURIComponent(String(userId))}`, {
      text,
      ...(keyboard ? { attachments: [keyboard] } : {}),
    });
  }

  private async answerCallback(
    callbackId: string,
    text?: string,
    keyboard?: MaxKeyboardAttachment,
    notification?: string,
  ): Promise<void> {
    await this.maxRequest(`/answers?callback_id=${encodeURIComponent(callbackId)}`, {
      ...(text ? { message: { text, ...(keyboard ? { attachments: [keyboard] } : {}) } } : {}),
      ...(notification ? { notification } : {}),
    });
  }

  private async maxRequest(path: string, body: unknown): Promise<void> {
    const token = this.config.get<string>('MAX_BOT_TOKEN');
    if (!token) throw new Error('MAX_BOT_TOKEN not configured');
    const response = await fetch(`${MAX_API}${path}`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      this.logger.error(`MAX API ${response.status}: ${responseBody}`);
      throw new Error(`MAX API error ${response.status}`);
    }
  }

  private eventIdFromPayload(payload: string): string | undefined {
    const value = payload.startsWith('remind_') ? payload.slice('remind_'.length) : '';
    return value.split('_')[0] || undefined;
  }

  private normalizePhone(value: string): string | null {
    const cleaned = value.replace(/[\s\-()]/g, '');
    return /^(\+7|7|8)\d{10}$/.test(cleaned) ? `+7${cleaned.slice(-10)}` : null;
  }

  private legalNotice(includeMarketing: boolean): string {
    const lines = [
      'Прежде чем продолжить, ознакомьтесь с документами:',
      '',
      `• Политика конфиденциальности: ${SITE_URL}/legal/privacy`,
      `• Пользовательское соглашение: ${SITE_URL}/legal/terms`,
      `• Согласие на обработку персональных данных: ${SITE_URL}/legal/consent`,
    ];
    if (includeMarketing) lines.push(`• Согласие на информационные рассылки: ${SITE_URL}/legal/broadcast-consent`);
    lines.push('', 'Нажмите кнопку «Принять», чтобы подтвердить согласие и продолжить.');
    return lines.join('\n');
  }
}
