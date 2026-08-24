import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReminderDto } from './create-reminder.dto';

const TG_API = 'https://api.telegram.org';
const MAX_API = 'https://platform-api2.max.ru';
const DELIVERY_ATTEMPTS = 3;
const DELIVERY_TIMEOUT_MS = 15_000;

function formatMsk(date: Date): string {
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const withCause = error as Error & { cause?: unknown };
  const cause = withCause.cause instanceof Error
    ? `: ${withCause.cause.message}`
    : withCause.cause != null
      ? `: ${String(withCause.cause)}`
      : '';
  return `${error.message}${cause}`;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private readonly siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'https://ab-event.pro';

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReminderDto) {
    const remindAt = new Date(dto.remindAt);
    if (isNaN(remindAt.getTime())) {
      throw new BadRequestException('remindAt is not a valid date');
    }
    if (remindAt.getTime() <= Date.now()) {
      throw new BadRequestException('remindAt must be in the future');
    }

    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId },
      select: { id: true, startDate: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (remindAt.getTime() >= event.startDate.getTime()) {
      throw new BadRequestException('remindAt must be before event start time');
    }

    const botUser = await this.prisma.botUser.findUnique({ where: { id: dto.botUserId } });
    if (!botUser) throw new NotFoundException('BotUser not found');

    const windowStart = new Date(remindAt);
    windowStart.setSeconds(0, 0);
    const windowEnd = new Date(windowStart.getTime() + 60_000);

    const existing = await this.prisma.reminder.findFirst({
      where: {
        botUserId: dto.botUserId,
        eventId: dto.eventId,
        status: 'PENDING',
        remindAt: { gte: windowStart, lt: windowEnd },
      },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Reminder already exists for this time',
        reminderId: existing.id,
        remindAt: existing.remindAt,
      });
    }

    return this.prisma.reminder.create({
      data: {
        eventId: dto.eventId,
        botUserId: dto.botUserId,
        remindAt,
        timezone: dto.timezone ?? 'Europe/Moscow',
      },
    });
  }

  async findPending() {
    const now = new Date();
    return this.prisma.reminder.findMany({
      where: { status: 'PENDING', remindAt: { lte: now } },
      include: { event: true, botUser: true },
      orderBy: { remindAt: 'asc' },
      take: 100,
    });
  }

  async markSent(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), failedAt: null, failReason: null },
    });
  }

  async markFailed(id: string, reason: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { status: 'FAILED', failedAt: new Date(), failReason: reason },
    });
  }

  async cancel(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private async fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        });

        if (response.status < 500 || attempt === DELIVERY_ATTEMPTS) return response;
        lastError = new Error(`${label} HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt === DELIVERY_ATTEMPTS) break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }

    throw new Error(`${label} network error: ${errorMessage(lastError)}`);
  }

  private async dispatchTelegram(externalId: string, text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

    const res = await this.fetchWithRetry(`${TG_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: externalId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }, 'Telegram API');

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Telegram API error ${res.status}: ${body || res.statusText}`);
    }
  }

  private async dispatchMax(externalId: string, text: string): Promise<void> {
    const token = process.env.MAX_BOT_TOKEN;
    if (!token) throw new Error('MAX_BOT_TOKEN not configured');

    const userId = encodeURIComponent(externalId);
    const res = await this.fetchWithRetry(`${MAX_API}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }, 'MAX API');

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MAX API error ${res.status}: ${body || res.statusText}`);
    }
  }

  private async logDispatchFailure(reminder: {
    id: string;
    eventId: string;
    botUserId: string;
    botUser: { channel: string };
  }, reason: string): Promise<void> {
    await this.prisma.errorLog.create({
      data: {
        context: 'reminder-dispatch',
        message: reason,
        payload: {
          reminderId: reminder.id,
          eventId: reminder.eventId,
          botUserId: reminder.botUserId,
          channel: reminder.botUser.channel,
        },
      },
    }).catch((error) => {
      this.logger.error(`Failed to persist ErrorLog for reminder ${reminder.id}: ${errorMessage(error)}`);
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueReminders() {
    const due = await this.findPending();
    if (!due.length) return;
    this.logger.log(`Dispatching ${due.length} due reminder(s)`);

    for (const reminder of due) {
      try {
        const { event, botUser } = reminder;
        const eventUrl = `${this.siteUrl}/events/${event.id}`;
        const eventDateMsk = formatMsk(event.startDate);

        let text: string;
        if (botUser.channel === 'TELEGRAM') {
          text =
            `🔔 Напоминание о мероприятии\n\n` +
            `<b>${event.title}</b>\n` +
            `📅 Начало: ${eventDateMsk} МСК\n\n` +
            `<a href="${eventUrl}">Подробнее о мероприятии</a>`;
          await this.dispatchTelegram(botUser.externalId, text);
        } else {
          text =
            `🔔 Напоминание о мероприятии\n\n` +
            `${event.title}\n` +
            `Начало: ${eventDateMsk} МСК\n\n` +
            `Подробнее: ${eventUrl}`;
          await this.dispatchMax(botUser.externalId, text);
        }

        await this.markSent(reminder.id);
        this.logger.log(`Reminder ${reminder.id} sent via ${botUser.channel}`);
      } catch (error) {
        const reason = errorMessage(error);
        await this.markFailed(reminder.id, reason).catch(() => null);
        await this.logDispatchFailure(reminder, reason);
        this.logger.error(`Reminder ${reminder.id} failed: ${reason}`);
      }
    }
  }
}
