import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReminderDto } from './create-reminder.dto';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

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
      select: { id: true, startAt: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (remindAt.getTime() >= event.startAt.getTime()) {
      throw new BadRequestException('remindAt must be before event start time');
    }

    const botUser = await this.prisma.botUser.findUnique({ where: { id: dto.botUserId } });
    if (!botUser) throw new NotFoundException('BotUser not found');

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

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueReminders() {
    const due = await this.findPending();
    if (!due.length) return;
    this.logger.log(`Processing ${due.length} due reminder(s)`);
    // Actual dispatch is handled by bots polling or a dedicated notification worker.
  }
}
