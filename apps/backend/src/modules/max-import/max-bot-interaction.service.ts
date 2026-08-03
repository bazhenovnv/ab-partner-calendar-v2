import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SITE_URL,
  adjustReminderTime,
  buildReminderCalendar,
  buildReminderDateTime,
  getInitialReminderMonth,
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
  view: 'calendar' | 'time';
  pendingDate?: string;
  pendingTime: string;
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

    await this.sendMessage(sender.userId, 'Используйте календарь и кнопки настройки времени.');
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
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    const dateMatch = /^reminder_date:(\d{4}-\d{2}-\d{2})$/.exec(payload);
    if (dateMatch) {
      state.pendingDate = dateMatch[1];
      state.pendingTime = '09:00';
      state.view = 'time';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    const timeMatch = /^reminder_time:(-?\d+)$/.exec(payload);
    if (timeMatch) {
      state.pendingTime = adjustReminderTime(state.pendingTime, Number(timeMatch[1]));
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
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
      );
      return;
    }

    if (payload === 'reminder_add') {
      if (!state.pendingDate) {
        await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Сначала выберите дату.');
        return;
      }

      const option = buildReminderDateTime(
        state.pendingDate,
        state.pendingTime,
        state.eventStartDate,
        state.eventStartTime,
      );
      if (!option) {
        await this.answerCallback(
          update.callback.callbackId,
          undefined,
          undefined,
          'Выберите будущее время до начала мероприятия.',
        );
        return;
      }

      state.selected.set(option.id, option);
      state.view = 'calendar';
      state.pendingDate = undefined;
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
        'Напоминание добавлено.',
      );
      return;
    }

    if (payload === 'reminder_clear') {
      state.selected.clear();
      state.view = 'calendar';
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state),
        this.selectorKeyboard(state),
        'Выбор очищен.',
      );
      return;
    }

    if (payload !== 'reminder_apply') return;

    const selected = [...state.selected.values()]
      .sort((left, right) => left.remindAt.localeCompare(right.remindAt));
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
      await this.answerCallback(update.callback.callbackId, undefined, undefined, `Не удалось сохранить ${failed} напоминание(я).`);
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

    const monthId = getInitialReminderMonth(event.startDate);
    if (!monthId) {
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
      pendingTime: '09:00',
      selected: new Map<string, ReminderDateTimeOption>(),
    };
    this.states.set(userId, state);
    await this.sendMessage(userId, this.selectorText(state), this.selectorKeyboard(state));
  }

  private selectedSummary(state: MaxReminderState): string {
    if (!state.selected.size) return 'Выбранных напоминаний пока нет.';
    return `Выбрано:\n${[...state.selected.values()]
      .sort((left, right) => left.remindAt.localeCompare(right.remindAt))
      .map((option) => `• ${option.label} МСК`)
      .join('\n')}`;
  }

  private selectorText(state: MaxReminderState): string {
    if (state.view === 'time') {
      return (
        `Настройка времени напоминания\n\n` +
        `Дата: ${state.pendingDate ?? 'не выбрана'}\n` +
        `Время: ${state.pendingTime} МСК\n\n` +
        'Измените время кнопками и нажмите «Добавить».'
      );
    }

    return (
      `Календарь напоминаний\n\n` +
      `Мероприятие: «${state.eventTitle}»\n\n` +
      `${this.selectedSummary(state)}\n\n` +
      'Выберите дату в календаре. Затем настройте время.'
    );
  }

  private selectorKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    return state.view === 'time'
      ? this.timeKeyboard(state)
      : this.calendarKeyboard(state);
  }

  private calendarKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    const calendar = buildReminderCalendar(state.eventStartDate, state.monthId);
    if (!calendar) {
      return {
        type: 'inline_keyboard',
        payload: { buttons: [[this.button('Нет доступных дат', 'reminder_noop')]] },
      };
    }

    const buttons: MaxButton[][] = [[
      this.button(calendar.canGoPrevious ? '‹' : '·', calendar.canGoPrevious ? 'reminder_month:-1' : 'reminder_noop'),
      this.button(calendar.label, 'reminder_noop'),
      this.button(calendar.canGoNext ? '›' : '·', calendar.canGoNext ? 'reminder_month:1' : 'reminder_noop'),
    ]];

    buttons.push(WEEKDAYS.map((weekday) => this.button(weekday, 'reminder_noop')));

    const selectedDates = new Set([...state.selected.values()].map((option) => option.dateId));
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
        this.button('Очистить', 'reminder_clear'),
      ]);
    } else {
      buttons.push([this.button('Выберите дату', 'reminder_noop')]);
    }

    return { type: 'inline_keyboard', payload: { buttons } };
  }

  private timeKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    return {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            this.button('−1 ч', 'reminder_time:-60'),
            this.button(state.pendingTime, 'reminder_noop'),
            this.button('+1 ч', 'reminder_time:60'),
          ],
          [
            this.button('−15 мин', 'reminder_time:-15'),
            this.button('+15 мин', 'reminder_time:15'),
          ],
          [
            this.button('← Календарь', 'reminder_back'),
            this.button('Добавить', 'reminder_add'),
          ],
        ],
      },
    };
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
