import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateBroadcastDto {
  title: string;
  messageText: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  channel?: 'TELEGRAM' | 'MAX' | 'ALL';
  audienceFilter?: Record<string, unknown>;
  scheduledAt?: string;
}

export interface UpdateBroadcastDto {
  title?: string;
  messageText?: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  channel?: 'TELEGRAM' | 'MAX' | 'ALL';
  audienceFilter?: Record<string, unknown>;
  scheduledAt?: string | null;
}

export const BROADCAST_QUEUE = 'broadcast';

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BROADCAST_QUEUE) private readonly broadcastQueue: Queue,
  ) {}

  // ── config helpers ────────────────────────────────────────────────────────

  private async getSiteConfigNumber(key: string, fallback: number): Promise<number> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key } });
    return typeof cfg?.value === 'number' ? (cfg.value as number) : fallback;
  }

  async getCooldownHours(): Promise<number> {
    return this.getSiteConfigNumber('broadcast.cooldownHours', 24);
  }

  async getTelegramRate(): Promise<number> {
    return this.getSiteConfigNumber('broadcast.telegramRatePerSecond', 20);
  }

  async getMaxRate(): Promise<number> {
    return this.getSiteConfigNumber('broadcast.maxRatePerSecond', 10);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.broadcast.count(),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException(`Broadcast ${id} not found`);
    const stats = await this.getStats(id);
    return { ...broadcast, stats };
  }

  async create(dto: CreateBroadcastDto) {
    return this.prisma.broadcast.create({
      data: {
        title: dto.title,
        messageText: dto.messageText,
        imageUrl: dto.imageUrl ?? null,
        buttonText: dto.buttonText ?? null,
        buttonUrl: dto.buttonUrl ?? null,
        channel: (dto.channel as any) ?? 'ALL',
        audienceFilter: (dto.audienceFilter as any) ?? {},
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'DRAFT',
      },
    });
  }

  async update(id: string, dto: UpdateBroadcastDto) {
    const existing = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Broadcast ${id} not found`);
    if ((existing.status as string) !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT broadcasts can be edited');
    }
    return this.prisma.broadcast.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.messageText !== undefined && { messageText: dto.messageText }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.buttonText !== undefined && { buttonText: dto.buttonText }),
        ...(dto.buttonUrl !== undefined && { buttonUrl: dto.buttonUrl }),
        ...(dto.channel !== undefined && { channel: dto.channel as any }),
        ...(dto.audienceFilter !== undefined && { audienceFilter: dto.audienceFilter as any }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Broadcast ${id} not found`);
    if (!['DRAFT', 'CANCELLED', 'FAILED'].includes(existing.status as string)) {
      throw new BadRequestException('Only DRAFT, CANCELLED or FAILED broadcasts can be deleted');
    }
    await this.prisma.broadcast.delete({ where: { id } });
    return { ok: true };
  }

  // ── test send ─────────────────────────────────────────────────────────────

  async testSend(id: string, adminChatId: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException(`Broadcast ${id} not found`);
    if ((broadcast.status as string) !== 'DRAFT') {
      throw new BadRequestException('Test send only available for DRAFT broadcasts');
    }

    // Attempt to send via Telegram (admin preview)
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    let sent = false;
    if (tgToken && adminChatId) {
      try {
        const text = this.buildMessageText(broadcast as any);
        const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: `[ТЕСТ РАССЫЛКИ]\n\n${text}`,
            parse_mode: 'HTML',
          }),
        });
        sent = res.ok;
      } catch (err) {
        this.logger.warn(`Test send to admin failed: ${err}`);
      }
    }

    await this.prisma.broadcast.update({
      where: { id },
      data: { testSentAt: new Date() },
    });

    await this.prisma.broadcastLog.create({
      data: {
        broadcastId: id,
        level: 'info',
        message: `Test send to admin ${adminChatId}. Telegram API: ${sent ? 'ok' : 'skipped/failed'}`,
      },
    });

    return { ok: true, sent };
  }

  // ── enqueue / schedule ────────────────────────────────────────────────────

  async enqueue(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException(`Broadcast ${id} not found`);
    if ((broadcast.status as string) !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT broadcasts can be scheduled');
    }
    if (!broadcast.testSentAt) {
      throw new BadRequestException(
        'Test send is required before scheduling (BR-022). Call POST /broadcasts/:id/test-send first.',
      );
    }

    // Check if another broadcast is currently SENDING (BR-021)
    const sending = await this.prisma.broadcast.findFirst({
      where: { status: { in: ['SENDING', 'QUEUED'] as any[] } },
      orderBy: { createdAt: 'asc' },
    });

    const newStatus = sending ? 'QUEUED' : 'SCHEDULED';
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: newStatus as any },
    });

    await this.prisma.broadcastLog.create({
      data: { broadcastId: id, level: 'info', message: `Broadcast status set to ${newStatus}` },
    });

    if (newStatus === 'SCHEDULED') {
      // Schedule delay if scheduledAt is in the future
      const delay =
        broadcast.scheduledAt && broadcast.scheduledAt.getTime() > Date.now()
          ? broadcast.scheduledAt.getTime() - Date.now()
          : 0;

      await this.broadcastQueue.add('send', { broadcastId: id }, { delay, attempts: 1 });
    }

    return { ok: true, status: newStatus };
  }

  // ── cancel ────────────────────────────────────────────────────────────────

  async cancel(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException(`Broadcast ${id} not found`);
    if (['SENT', 'CANCELLED'].includes(broadcast.status as string)) {
      throw new BadRequestException(`Cannot cancel a ${broadcast.status} broadcast`);
    }

    await this.prisma.broadcast.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });

    // Mark PENDING recipients as SKIPPED
    await this.prisma.broadcastRecipient.updateMany({
      where: { broadcastId: id, status: 'PENDING' as any },
      data: { status: 'SKIPPED' as any, skippedReason: 'Broadcast cancelled' },
    });

    await this.prisma.broadcastLog.create({
      data: { broadcastId: id, level: 'info', message: 'Broadcast cancelled by admin' },
    });

    return { ok: true };
  }

  // ── recipients ────────────────────────────────────────────────────────────

  async getRecipients(broadcastId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.broadcastRecipient.findMany({
        where: { broadcastId },
        include: { botUser: { select: { channel: true, externalId: true, username: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.broadcastRecipient.count({ where: { broadcastId } }),
    ]);
    return { items, total, page, limit };
  }

  // ── logs ──────────────────────────────────────────────────────────────────

  async getLogs(broadcastId: string, page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.broadcastLog.findMany({
        where: { broadcastId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.broadcastLog.count({ where: { broadcastId } }),
    ]);
    return { items, total, page, limit };
  }

  // ── stats ─────────────────────────────────────────────────────────────────

  async getStats(broadcastId: string) {
    const rows = await this.prisma.broadcastRecipient.groupBy({
      by: ['status'],
      where: { broadcastId },
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      rows.map((r: { status: unknown; _count: { _all: number } }) => [r.status, r._count._all]),
    );

    return {
      total: Object.values(byStatus).reduce((a: number, b) => a + (b as number), 0),
      pending: (byStatus['PENDING'] as number) ?? 0,
      sent: (byStatus['SENT'] as number) ?? 0,
      failed: (byStatus['FAILED'] as number) ?? 0,
      skipped: (byStatus['SKIPPED'] as number) ?? 0,
    };
  }

  // ── unsubscribe ───────────────────────────────────────────────────────────

  async unsubscribe(channel: 'TELEGRAM' | 'MAX', externalId: string) {
    const user = await this.prisma.botUser.findFirst({
      where: { channel: channel as any, externalId },
    });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.botUser.update({
      where: { id: user.id },
      data: { allowMarketingMessages: false },
    });
    await this.logger.log(`User ${channel}:${externalId} unsubscribed from marketing broadcasts`);
    return { ok: true };
  }

  // ── internal: build recipients list ──────────────────────────────────────

  async buildRecipients(broadcastId: string): Promise<number> {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) return 0;

    const channelFilter = this.buildChannelFilter(broadcast.channel as string);

    const users = await this.prisma.botUser.findMany({
      where: {
        allowMarketingMessages: true,
        legalAcceptedAt: { not: null },
        ...channelFilter,
      },
      select: { id: true, channel: true },
    });

    // Create recipients in bulk (skip existing)
    const existing = await this.prisma.broadcastRecipient.findMany({
      where: { broadcastId },
      select: { botUserId: true },
    });
    const existingIds = new Set(existing.map((r: { botUserId: string }) => r.botUserId));

    const newRecipients = users
      .filter((u: { id: string; channel: unknown }) => !existingIds.has(u.id))
      .map((u: { id: string; channel: unknown }) => ({
        broadcastId,
        botUserId: u.id,
        channel: u.channel as any,
        status: 'PENDING' as any,
      }));

    if (newRecipients.length > 0) {
      await this.prisma.broadcastRecipient.createMany({ data: newRecipients });
    }

    return newRecipients.length + existingIds.size;
  }

  private buildChannelFilter(channel: string): Record<string, unknown> {
    if (channel === 'TELEGRAM') return { channel: 'TELEGRAM' };
    if (channel === 'MAX') return { channel: 'MAX' };
    return {}; // ALL
  }

  // ── internal: message text builder ───────────────────────────────────────

  buildMessageText(broadcast: { messageText: string; buttonText?: string | null; buttonUrl?: string | null }): string {
    let text = broadcast.messageText;
    if (broadcast.buttonText && broadcast.buttonUrl) {
      text += `\n\n<a href="${broadcast.buttonUrl}">${broadcast.buttonText}</a>`;
    }
    return text;
  }

  // ── internal: check cooldown ──────────────────────────────────────────────

  async isCooldownActive(botUserId: string, cooldownHours: number): Promise<boolean> {
    if (cooldownHours <= 0) return false;
    const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    const recent = await this.prisma.broadcastRecipient.findFirst({
      where: {
        botUserId,
        status: 'SENT' as any,
        sentAt: { gte: since },
      },
    });
    return !!recent;
  }

  // ── internal: send single message ─────────────────────────────────────────

  async sendToRecipient(
    recipient: { id: string; botUserId: string; channel: string },
    text: string,
  ): Promise<{ success: boolean; reason?: string }> {
    const user = await this.prisma.botUser.findUnique({
      where: { id: recipient.botUserId },
      select: { externalId: true, channel: true },
    });
    if (!user) return { success: false, reason: 'BotUser not found' };

    if (recipient.channel === 'TELEGRAM') {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return { success: false, reason: 'TELEGRAM_BOT_TOKEN not configured' };
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: user.externalId, text, parse_mode: 'HTML' }),
        });
        if (res.ok) return { success: true };
        const body = await res.json() as { description?: string };
        return { success: false, reason: body.description ?? `HTTP ${res.status}` };
      } catch (err: unknown) {
        return { success: false, reason: String(err) };
      }
    }

    if (recipient.channel === 'MAX') {
      const token = process.env.MAX_BOT_TOKEN;
      if (!token) return { success: false, reason: 'MAX_BOT_TOKEN not configured' };
      try {
        const res = await fetch('https://api.max.ru/v1/messages', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: user.externalId, text }),
        });
        if (res.ok) return { success: true };
        return { success: false, reason: `HTTP ${res.status}` };
      } catch (err: unknown) {
        return { success: false, reason: String(err) };
      }
    }

    return { success: false, reason: `Unsupported channel: ${recipient.channel}` };
  }

  // ── internal: start next queued broadcast ─────────────────────────────────

  async startNextQueued(): Promise<void> {
    const next = await this.prisma.broadcast.findFirst({
      where: { status: 'QUEUED' as any },
      orderBy: { createdAt: 'asc' },
    });
    if (!next) return;

    await this.prisma.broadcast.update({
      where: { id: next.id },
      data: { status: 'SCHEDULED' as any },
    });

    await this.broadcastQueue.add('send', { broadcastId: next.id }, { attempts: 1 });
    this.logger.log(`Started next queued broadcast: ${next.id}`);
  }
}
