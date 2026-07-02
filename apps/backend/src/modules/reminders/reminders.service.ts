import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReminderDto } from './create-reminder.dto';

const TG_API = 'https://api.telegram.org';
const MAX_API = 'https://api.max.ru/v1';

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

    // Deduplication: same user + same event + same minute → duplicate
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
      data: { status: 'SENT', sentAt: new Date() },
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

  // ── private dispatch helpers ──────────────────────────────────────────────

  private async dispatchTelegram(externalId: string, text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

    const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: externalId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Telegram API error ${res.status}: ${body}`);
    }
  }

  private async dispatchMax(externalId: string, text: string): Promise<void> {
    const token = process.env.MAX_BOT_TOKEN;
    if (!token) throw new Error('MAX_BOT_TOKEN not configured');

    const res = await fetch(`${MAX_API}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: externalId, text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MAX API error ${res.status}: ${body}`);
    }
  }

  // ── cron: dispatch due reminders (BR-010, BR-011, BR-021) ─────────────────

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
        this.logger.log(`Reminder ${reminder.id} sent via ${botUser.channel} to ${botUser.externalId}`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        await this.markFailed(reminder.id, reason).catch(() => null);
        this.logger.error(`Reminder ${reminder.id} failed: ${reason}`);
      }
    }
  }
}
