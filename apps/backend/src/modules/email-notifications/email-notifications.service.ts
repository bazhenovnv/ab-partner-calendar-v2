import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmtpMailService } from './smtp-mail.service';

const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(EmailNotificationsService.name);
  private readonly startedAt = new Date();
  private smtpWarningLogged = false;
  private dispatchInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: SmtpMailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchNeedsAttentionEmails(): Promise<void> {
    if (this.dispatchInProgress) return;
    if (!this.mail.isConfigured()) {
      if (!this.smtpWarningLogged) {
        this.logger.warn(
          'Needs-attention email delivery is disabled until SMTP_HOST and SMTP_FROM/SMTP_USER are configured',
        );
        this.smtpWarningLogged = true;
      }
      return;
    }

    this.smtpWarningLogged = false;
    this.dispatchInProgress = true;
    try {
      const notifications = await this.prisma.adminNotification.findMany({
        where: {
          type: 'NEEDS_ATTENTION',
          sentAt: null,
          failedAt: null,
          // Do not suddenly email historical notifications that existed before
          // this backend process started. New notifications are delivered normally.
          createdAt: { gte: this.startedAt },
        },
        orderBy: { createdAt: 'asc' },
        take: 25,
      });

      for (const notification of notifications) {
        await this.deliver(notification.id, notification.message, notification.createdAt);
      }
    } finally {
      this.dispatchInProgress = false;
    }
  }

  private async deliver(id: string, message: string, createdAt: Date): Promise<void> {
    const duplicateSince = new Date(createdAt.getTime() - DUPLICATE_WINDOW_MS);
    const recentlyProcessed = await this.prisma.adminNotification.findFirst({
      where: {
        id: { not: id },
        type: 'NEEDS_ATTENTION',
        message,
        sentAt: { not: null },
        createdAt: { gte: duplicateSince, lt: createdAt },
      },
      select: { id: true },
    });

    if (recentlyProcessed) {
      // The MAX importer can repeat the same unresolved warning on every sync.
      // Mark the duplicate as processed so one unresolved event does not spam email.
      await this.prisma.adminNotification.update({
        where: { id },
        data: { sentAt: new Date() },
      });
      return;
    }

    const parsed = this.parseNeedsAttentionMessage(message);
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || 'https://ab-event.pro'
    ).replace(/\/+$/, '');

    try {
      await this.mail.sendNeedsAttention({
        title: parsed.title,
        reasons: parsed.reasons,
        adminUrl: `${siteUrl}/admin/needs-attention`,
      });
      await this.prisma.adminNotification.update({
        where: { id },
        data: { sentAt: new Date(), failedAt: null, failReason: null },
      });
      this.logger.log(
        `Needs-attention email sent to ${this.mail.recipientAddress()} for notification ${id}`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.prisma.adminNotification.update({
        where: { id },
        data: {
          failedAt: new Date(),
          failReason: detail.slice(0, 1000),
        },
      });
      await this.prisma.errorLog.create({
        data: {
          context: 'needs-attention-email',
          message: detail.slice(0, 1000),
          payload: { notificationId: id, recipient: this.mail.recipientAddress() },
        },
      });
      this.logger.error(`Needs-attention email failed for notification ${id}: ${detail}`);
    }
  }

  private parseNeedsAttentionMessage(message: string): { title: string; reasons: string[] } {
    const match = message.match(/^Событие «(.+?)» требует внимания:\s*(.*)$/u);
    if (!match) {
      return { title: 'Событие требует внимания', reasons: [message] };
    }

    const reasons = match[2]
      .split(/,\s+/)
      .map((reason) => reason.trim())
      .filter(Boolean);

    return {
      title: match[1].trim() || 'Без названия',
      reasons: reasons.length > 0 ? reasons : ['Причина не указана'],
    };
  }
}
