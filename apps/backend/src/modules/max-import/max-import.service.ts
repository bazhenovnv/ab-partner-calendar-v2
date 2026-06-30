import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MaxParserService } from './max-parser.service';
import { MAX_IMPORT_CHANNEL } from '@ab-afisha/shared';

@Injectable()
export class MaxImportService {
  private readonly logger = new Logger(MaxImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: MaxParserService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 * * * *')
  async runImport() {
    this.logger.log('Starting MAX import...');
    const log = { postsFound: 0, imported: 0, updated: 0, skipped: 0, errors: 0, errorDetail: [] as any[] };

    try {
      const posts = await this.fetchPosts();
      log.postsFound = posts.length;

      for (const post of posts) {
        try {
          await this.processPost(post, log);
        } catch (err) {
          log.errors++;
          log.errorDetail.push({ postId: post.id, error: String(err) });
          this.logger.error(`Error processing post ${post.id}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`MAX import failed: ${err}`);
      await this.notifyAdminError(`MAX import error: ${err}`);
    }

    await this.prisma.maxImportLog.create({ data: log });
    this.logger.log(`MAX import done: ${JSON.stringify(log)}`);
  }

  async runManual(): Promise<{ log: any }> {
    const log = { postsFound: 0, imported: 0, updated: 0, skipped: 0, errors: 0, errorDetail: [] as any[] };
    const posts = await this.fetchPosts();
    log.postsFound = posts.length;
    for (const post of posts) {
      try {
        await this.processPost(post, log);
      } catch (err) {
        log.errors++;
        log.errorDetail.push({ postId: post.id, error: String(err) });
      }
    }
    return { log };
  }

  private async fetchPosts(): Promise<any[]> {
    const token = this.config.get<string>('MAX_BOT_TOKEN');
    if (!token) {
      this.logger.warn('MAX_BOT_TOKEN not set, skipping import');
      return [];
    }
    const url = `https://api.max.ru/v1/channels/posts?channel_url=${encodeURIComponent(MAX_IMPORT_CHANNEL)}&limit=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`MAX API error: ${res.status} ${res.statusText}`);
    const data = await res.json() as any;
    return data.posts ?? data.items ?? [];
  }

  private async processPost(post: any, log: any) {
    const externalId = String(post.id ?? post.post_id ?? '');
    const sourcePostUrl = post.url ?? post.link ?? '';
    const rawText = post.text ?? post.content ?? '';
    const postDate = post.created_at ? new Date(post.created_at) : undefined;

    if (this.parser.isCollectionPost(rawText)) { log.skipped++; return; }

    const parsed = this.parser.parse(rawText, postDate);
    const existing = await this.prisma.event.findFirst({
      where: { OR: [{ externalId }, { sourcePostUrl }] },
    });
    const status = parsed.needsAttention ? 'NEEDS_ATTENTION' : 'DRAFT';

    if (existing) {
      await this.prisma.event.update({
        where: { id: existing.id },
        data: {
          lastSyncedAt: new Date(),
          sourcePostUrl,
          ...(parsed.title && { title: parsed.title }),
          ...(parsed.shortDescription && { shortDescription: parsed.shortDescription }),
          ...(parsed.startDate && { startDate: parsed.startDate }),
          ...(parsed.endDate !== undefined && { endDate: parsed.endDate }),
          ...(parsed.startTime && { startTime: parsed.startTime }),
          ...(parsed.format && { format: parsed.format }),
          ...(parsed.city && { cityName: parsed.city }),
          ...(parsed.venue && { venue: parsed.venue }),
          ...(parsed.address && { address: parsed.address }),
          ...(parsed.eventUrl && { eventUrl: parsed.eventUrl }),
          ...(parsed.priceType && { priceType: parsed.priceType }),
          ...(parsed.priceText && { priceText: parsed.priceText }),
          ...(parsed.speaker && { speaker: parsed.speaker }),
          mainEvent: parsed.mainEvent,
        },
      });
      log.updated++;
    } else {
      await this.prisma.event.create({
        data: {
          title: parsed.title ?? 'Без названия',
          shortDescription: parsed.shortDescription,
          fullDescription: parsed.fullDescription,
          startDate: parsed.startDate ?? new Date(),
          endDate: parsed.endDate,
          startTime: parsed.startTime,
          format: parsed.format ?? 'ONLINE',
          cityName: parsed.city,
          venue: parsed.venue,
          address: parsed.address,
          eventUrl: parsed.eventUrl,
          priceType: parsed.priceType ?? 'FREE',
          priceText: parsed.priceText,
          speaker: parsed.speaker,
          mainEvent: parsed.mainEvent,
          source: 'MAX',
          externalId,
          sourcePostUrl,
          sourceChannelUrl: MAX_IMPORT_CHANNEL,
          status,
          tags: parsed.tags.length ? { create: parsed.tags.map((tag) => ({ tag })) } : undefined,
        },
      });
      if (parsed.needsAttention) await this.notifyAdminNeedsAttention(parsed.title, parsed.attentionReasons);
      log.imported++;
    }
  }

  private async notifyAdminError(message: string) {
    await this.prisma.adminNotification.create({ data: { type: 'MAX_IMPORT_ERROR', message } });
  }

  private async notifyAdminNeedsAttention(title: string | null, reasons: string[]) {
    await this.prisma.adminNotification.create({
      data: {
        type: 'NEEDS_ATTENTION',
        message: `Событие «${title ?? 'Без названия'}» требует внимания: ${reasons.join(', ')}`,
      },
    });
  }
}
