import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SITE_URL,
  buildReminderDateOptions,
  type ReminderDateOption,
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

interface MaxButton {
  type: 'callback';
  text: string;
  payload: string;
}

interface MaxKeyboardAttachment {
  type: 'inline_keyboard';
  payload: { buttons: MaxButton[][] };
}

type MaxUserState =
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

type MaxLegalState = Extract<MaxUserState, { step: 'awaitingLegal' }>;
type MaxReminderState = Extract<MaxUserState, { step: 'selectingReminderDates' }>;

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

    await this.sendMessage(sender.userId, 'Выберите даты кнопками, затем нажмите «Применить».');
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

    if (!state || state.step !== 'selectingReminderDates') {
      await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Начните выбор заново через кнопку «Напомнить».');
      return;
    }

    const toggleMatch = /^reminder_toggle:(\d+)$/.exec(payload);
    if (toggleMatch) {
      const option = state.options[Number(toggleMatch[1])];
      if (option) {
        if (state.selected.has(option.id)) state.selected.delete(option.id);
        else state.selected.add(option.id);
      }
      await this.answerCallback(
        update.callback.callbackId,
        this.selectorText(state.eventTitle),
        this.reminderKeyboard(state),
      );
      return;
    }

    if (payload !== 'reminder_apply') return;
    const selected = state.options.filter((option) => state.selected.has(option.id));
    if (!selected.length) {
      await this.answerCallback(update.callback.callbackId, undefined, undefined, 'Сначала выберите хотя бы одну дату.');
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
        selected.map((option) => `• ${option.label}, 09:00 МСК`).join('\n'),
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
      select: { title: true, startDate: true },
    });
    if (!event) {
      this.states.delete(userId);
      await this.sendMessage(userId, 'Мероприятие не найдено или уже снято с публикации.');
      return;
    }

    const options = buildReminderDateOptions(event.startDate);
    if (!options.length) {
      this.states.delete(userId);
      await this.sendMessage(userId, 'Для этого мероприятия уже нет доступных дат напоминания.');
      return;
    }

    const state: MaxReminderState = {
      step: 'selectingReminderDates',
      botUserId,
      eventId,
      eventTitle: event.title,
      options,
      selected: new Set<string>(),
    };
    this.states.set(userId, state);
    await this.sendMessage(userId, this.selectorText(event.title), this.reminderKeyboard(state));
  }

  private selectorText(eventTitle: string): string {
    return `Выберите одну или несколько дат напоминания для мероприятия «${eventTitle}».\n\nНапоминания будут отправлены в 09:00 МСК. После выбора нажмите «Применить».`;
  }

  private legalKeyboard(): MaxKeyboardAttachment {
    return {
      type: 'inline_keyboard',
      payload: {
        buttons: [[{
          type: 'callback',
          text: 'Принять',
          payload: 'accept_legal',
        }]],
      },
    };
  }

  private reminderKeyboard(state: MaxReminderState): MaxKeyboardAttachment {
    const buttons = state.options.map((option, index): MaxButton[] => [{
      type: 'callback',
      text: `${state.selected.has(option.id) ? '☑' : '□'} ${option.label}`,
      payload: `reminder_toggle:${index}`,
    }]);
    buttons.push([{
      type: 'callback',
      text: state.selected.size ? `Применить (${state.selected.size})` : 'Применить',
      payload: 'reminder_apply',
    }]);
    return { type: 'inline_keyboard', payload: { buttons } };
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
