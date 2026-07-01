import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService, BROADCAST_QUEUE } from './broadcasts.service';

interface SendJobData {
  broadcastId: string;
}

/** ms delay between messages — derived from rate (msgs/sec) */
function rateDelay(perSecond: number): number {
  return Math.ceil(1000 / Math.max(perSecond, 1));
}

@Processor(BROADCAST_QUEUE)
export class BroadcastProcessor {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastsService: BroadcastsService,
  ) {}

  @Process('send')
  async handleSend(job: Job<SendJobData>): Promise<void> {
    const { broadcastId } = job.data;
    this.logger.log(`Processing broadcast ${broadcastId}`);

    const broadcast = await this.prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) {
      this.logger.warn(`Broadcast ${broadcastId} not found`);
      return;
    }

    if (['CANCELLED', 'SENT'].includes(broadcast.status as string)) {
      this.logger.warn(`Broadcast ${broadcastId} is already ${broadcast.status}, skipping`);
      return;
    }

    // Build recipients list (idempotent)
    const total = await this.broadcastsService.buildRecipients(broadcastId);

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'SENDING' as any, startedAt: new Date() },
    });

    await this.prisma.broadcastLog.create({
      data: { broadcastId, level: 'info', message: `Sending started. ${total} recipients.` },
    });

    const cooldownHours = await this.broadcastsService.getCooldownHours();
    const tgRate = await this.broadcastsService.getTelegramRate();
    const maxRate = await this.broadcastsService.getMaxRate();

    const messageText = this.broadcastsService.buildMessageText(broadcast as any);

    // Add unsubscribe footer (BR-025)
    const unsubText = `\n\n<i>Чтобы отписаться от рассылок, ответьте /unsubscribe</i>`;
    const fullText = messageText + unsubText;

    let countSent = 0;
    let countFailed = 0;
    let countSkipped = 0;

    // Process in batches of 50.
    // Always query the first N PENDING rows — status changes remove them from
    // subsequent queries, so no skip/offset is needed or correct here.
    const BATCH = 50;

    while (true) {
      // Re-check if cancelled
      const fresh = await this.prisma.broadcast.findUnique({
        where: { id: broadcastId },
        select: { status: true },
      });
      if ((fresh?.status as string) === 'CANCELLED') {
        this.logger.log(`Broadcast ${broadcastId} was cancelled mid-send`);
        break;
      }

      const recipients = await this.prisma.broadcastRecipient.findMany({
        where: { broadcastId, status: 'PENDING' as any },
        take: BATCH,
        orderBy: { createdAt: 'asc' },
      });

      if (recipients.length === 0) break;

      for (const recipient of recipients) {
        // Cooldown check
        const onCooldown = await this.broadcastsService.isCooldownActive(
          recipient.botUserId,
          cooldownHours,
        );
        if (onCooldown) {
          await this.prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'SKIPPED' as any,
              skippedReason: `Cooldown active (${cooldownHours}h)`,
            },
          });
          countSkipped++;
          continue;
        }

        const result = await this.broadcastsService.sendToRecipient(
          { id: recipient.id, botUserId: recipient.botUserId, channel: recipient.channel as string },
          fullText,
        );

        if (result.success) {
          await this.prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: { status: 'SENT' as any, sentAt: new Date() },
          });
          countSent++;
        } else {
          await this.prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED' as any, failedAt: new Date(), failReason: result.reason },
          });
          countFailed++;
        }

        // Rate limiting
        const delay = recipient.channel === 'MAX' ? rateDelay(maxRate) : rateDelay(tgRate);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

    }

    // Mark broadcast complete
    const finalStatus: string = countFailed > 0 && countSent === 0 ? 'FAILED' : 'SENT';
    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: finalStatus as any, completedAt: new Date() },
    });

    await this.prisma.broadcastLog.create({
      data: {
        broadcastId,
        level: finalStatus === 'FAILED' ? 'error' : 'info',
        message: `Broadcast completed: ${countSent} sent, ${countFailed} failed, ${countSkipped} skipped`,
        payload: { countSent, countFailed, countSkipped } as any,
      },
    });

    this.logger.log(
      `Broadcast ${broadcastId} ${finalStatus}: sent=${countSent} failed=${countFailed} skipped=${countSkipped}`,
    );

    // Start next queued broadcast (BR-021)
    await this.broadcastsService.startNextQueued();
  }
}
