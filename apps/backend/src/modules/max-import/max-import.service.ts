import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MaxParserService, type ParsedMaxPost } from './max-parser.service';
import {
  normalizeMaxUpdate,
  type MaxUpdate,
  type MaxMessageCreatedUpdate,
  type MaxMessageEditedUpdate,
  type MaxMessageRemovedUpdate,
  type MaxBotAddedUpdate,
  type RawMaxUpdatesResponse,
  type MaxAttachmentPayload,
} from './max-api.types';

const MAX_API_BASE = 'https://platform-api2.max.ru';
const TZ_SOURCE_CHANNEL_URL = 'https://max.ru/join/tumioTNhr5Kh90TaDp1Tzgn-uDKw8Eko7KFhXdKeu9c';
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type LogEntryType =
  | 'FETCH_ERROR'
  | 'AUTH_ERROR'
  | 'SOURCE_NOT_FOUND'
  | 'UNSUPPORTED_EVENT'
  | 'PARSE_ERROR'
  | 'MEDIA_ERROR'
  | 'IMPORTED'
  | 'UPDATED'
  | 'REMOVED'
  | 'SKIPPED_DUPLICATE'
  | 'CHANNEL_MISMATCH'
  | 'RUN_SKIPPED';

interface ImportLog {
  postsFound: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetail: Array<{ type: LogEntryType; detail: string }>;
}

@Injectable()
export class MaxImportService {
  private readonly logger = new Logger(MaxImportService.name);
  private pollMarker: number | undefined;
  private pollInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: MaxParserService,
    private readonly config: ConfigService,
  ) {}

  /**
   * TZ requirement: check the approved MAX source every hour.
   * Webhook deliveries remain the real-time path; this poll reconciles missed updates.
   * The historical method name is retained because operational tests reference it.
   */
  @Cron('0 * * * *', { timeZone: 'Europe/Moscow' })
  async runHeartbeat(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug('MAX import disabled (MAX_IMPORT_ENABLED != true)');
      return;
    }

    const log = await this.runPollCycle();
    await this.persistLog(log);
    this.logger.log(
      `MAX hourly sync: found=${log.postsFound}, imported=${log.imported}, updated=${log.updated}, ` +
        `skipped=${log.skipped}, errors=${log.errors}`,
    );
  }

  /** Called by the public webhook controller for each inbound MAX update. */
  async processWebhookUpdate(rawPayload: unknown): Promise<void> {
    const update = normalizeMaxUpdate(rawPayload);
    if (!update) {
      this.logger.warn('Webhook: missing or invalid update_type in payload, ignoring');
      return;
    }

    const log = this.emptyLog();
    log.postsFound = 1;
    await this.dispatchUpdate(update, log);
    await this.persistLog(log);
  }

  /** Admin action: run the same reconciliation cycle immediately. */
  async runManual(): Promise<{ log: ImportLog }> {
    if (!this.isEnabled()) {
      return {
        log: {
          ...this.emptyLog(),
          errors: 1,
          errorDetail: [{ type: 'FETCH_ERROR', detail: 'MAX_IMPORT_ENABLED is false' }],
        },
      };
    }

    const log = await this.runPollCycle();
    await this.persistLog(log);
    return { log };
  }

  private async runPollCycle(): Promise<ImportLog> {
    const log = this.emptyLog();
    if (this.pollInProgress) {
      log.skipped++;
      log.errorDetail.push({ type: 'RUN_SKIPPED', detail: 'Previous MAX poll is still running' });
      return log;
    }

    this.pollInProgress = true;
    try {
      const updates = await this.pollUpdates(log);
      log.postsFound = updates.length;
      for (const update of updates) {
        await this.dispatchUpdate(update, log);
      }
    } catch (error) {
      log.errors++;
      log.errorDetail.push({ type: 'FETCH_ERROR', detail: String(error) });
    } finally {
      this.pollInProgress = false;
    }
    return log;
  }

  private isEnabled(): boolean {
    return this.config.get<string>('MAX_IMPORT_ENABLED') === 'true';
  }

  private emptyLog(): ImportLog {
    return { postsFound: 0, imported: 0, updated: 0, skipped: 0, errors: 0, errorDetail: [] };
  }

  private sourceChannelId(): number | null {
    const raw = this.config.get<string>('MAX_SOURCE_CHANNEL_ID');
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  }

  private sourceChannelUrl(): string {
    return this.config.get<string>('MAX_SOURCE_CHANNEL_URL') || TZ_SOURCE_CHANNEL_URL;
  }

  private token(): string | null {
    return this.config.get<string>('MAX_BOT_TOKEN') ?? null;
  }

  private maxHeaders(token: string): Record<string, string> {
    return { Authorization: token };
  }

  private async pollUpdates(log: ImportLog): Promise<MaxUpdate[]> {
    const token = this.token();
    if (!token) {
      log.errors++;
      log.errorDetail.push({ type: 'AUTH_ERROR', detail: 'MAX_BOT_TOKEN not set' });
      return [];
    }

    if (this.pollMarker === undefined) {
      const markerConfig = await this.prisma.siteConfig.findUnique({ where: { key: 'maxImport.pollMarker' } });
      if (typeof markerConfig?.value === 'number') this.pollMarker = markerConfig.value;
    }

    const params = new URLSearchParams({
      limit: '100',
      types: 'message_created,message_edited,message_removed,bot_added,bot_removed',
    });
    if (this.pollMarker !== undefined) params.set('marker', String(this.pollMarker));

    const response = await fetch(`${MAX_API_BASE}/updates?${params.toString()}`, {
      headers: this.maxHeaders(token),
      signal: AbortSignal.timeout(30_000),
    });

    if (response.status === 401 || response.status === 403) {
      log.errors++;
      log.errorDetail.push({
        type: 'AUTH_ERROR',
        detail: `HTTP ${response.status} — token invalid, revoked or access denied`,
      });
      return [];
    }
    if (!response.ok) {
      log.errors++;
      log.errorDetail.push({ type: 'FETCH_ERROR', detail: `HTTP ${response.status} ${response.statusText}` });
      return [];
    }

    const data = (await response.json()) as RawMaxUpdatesResponse;
    if (data.marker !== undefined) {
      this.pollMarker = data.marker;
      await this.prisma.siteConfig.upsert({
        where: { key: 'maxImport.pollMarker' },
        update: { value: data.marker },
        create: { key: 'maxImport.pollMarker', value: data.marker },
      });
    }

    return (data.updates ?? [])
      .map((raw) => normalizeMaxUpdate(raw))
      .filter((update): update is MaxUpdate => update !== null);
  }

  private async dispatchUpdate(update: MaxUpdate, log: ImportLog): Promise<void> {
    switch (update.updateType) {
      case 'bot_added':
        await this.handleBotAdded(update as MaxBotAddedUpdate);
        return;
      case 'message_created':
      case 'message_edited':
        await this.handleMessage(update as MaxMessageCreatedUpdate | MaxMessageEditedUpdate, log);
        return;
      case 'message_removed':
        await this.handleMessageRemoved(update as MaxMessageRemovedUpdate, log);
        return;
      default:
        log.skipped++;
        log.errorDetail.push({ type: 'UNSUPPORTED_EVENT', detail: update.updateType });
    }
  }

  private async handleBotAdded(update: MaxBotAddedUpdate): Promise<void> {
    const suffix = update.isChannel ? ' (channel)' : '';
    const message =
      `MAX bot добавлен в чат chat_id=${update.chatId}${suffix}. ` +
      `Для источника из ТЗ установите MAX_SOURCE_CHANNEL_ID=${update.chatId}.`;
    this.logger.warn(message);
    await this.notifyAdminError(message);
  }

  private async handleMessage(
    update: MaxMessageCreatedUpdate | MaxMessageEditedUpdate,
    log: ImportLog,
  ): Promise<void> {
    const sourceChannelId = this.sourceChannelId();
    const chatId = update.message?.recipient?.chatId;

    if (sourceChannelId === null) {
      log.errors++;
      log.errorDetail.push({ type: 'SOURCE_NOT_FOUND', detail: 'MAX_SOURCE_CHANNEL_ID not configured' });
      return;
    }
    if (chatId !== sourceChannelId) {
      log.skipped++;
      log.errorDetail.push({
        type: 'CHANNEL_MISMATCH',
        detail: `chat_id=${chatId} != MAX_SOURCE_CHANNEL_ID=${sourceChannelId}`,
      });
      return;
    }

    const externalId = update.message?.body?.mid ?? '';
    const text = update.message?.body?.text ?? '';
    const timestamp = update.message?.timestamp;
    const postDate = timestamp ? new Date(timestamp) : undefined;

    if (!externalId) {
      log.errors++;
      log.errorDetail.push({ type: 'PARSE_ERROR', detail: 'Empty message mid (externalId)' });
      return;
    }

    let parsed: ParsedMaxPost;
    try {
      parsed = this.parser.parse(text, postDate);
    } catch (error) {
      log.errors++;
      log.errorDetail.push({ type: 'PARSE_ERROR', detail: String(error) });
      return;
    }

    if (this.parser.isCollectionPost(text)) {
      this.addAttention(parsed, 'Пост-подборка: требуется ручная обработка без автоматического разделения');
    }

    const sourceChannelUrl = this.sourceChannelUrl();
    const sourcePostUrl = `${sourceChannelUrl}?mid=${encodeURIComponent(externalId)}`;
    const imageAttachment = (update.message?.body?.attachments ?? []).find((attachment) => attachment.type === 'image');

    try {
      const existing = await this.prisma.event.findFirst({
        where: { source: 'MAX', externalId },
        include: { images: true },
      });
      const directionIds = await this.resolveDirectionIds(parsed.directionSlugs);
      if (directionIds.length === 0) {
        this.addAttention(parsed, 'Направление отсутствует или не найдено в справочнике');
      }

      const existingHasImage = Boolean(
        existing?.images?.some((image) => image.eventCardUrl || image.originalUrl || image.thumbnailUrl),
      );
      if (!imageAttachment && !existingHasImage) {
        this.addAttention(parsed, 'Изображение события отсутствует');
      }

      if (existing) {
        let hasValidImage = existingHasImage;
        if (imageAttachment) {
          hasValidImage = await this.downloadAndStoreImage(
            existing.id,
            imageAttachment.payload as MaxAttachmentPayload | undefined,
            log,
          );
          if (!hasValidImage) this.addAttention(parsed, 'Изображение не удалось загрузить или обработать');
        }

        const status = parsed.needsAttention || !hasValidImage ? 'NEEDS_ATTENTION' : 'PUBLISHED';
        await this.prisma.event.update({
          where: { id: existing.id },
          data: {
            title: parsed.title ?? existing.title,
            shortDescription: parsed.shortDescription,
            fullDescription: parsed.fullDescription,
            startDate: parsed.startDate ?? existing.startDate,
            endDate: parsed.endDate,
            startTime: parsed.startTime,
            timezone: parsed.timezone,
            format: parsed.format ?? existing.format,
            isOnline: parsed.format === 'ONLINE',
            cityName: parsed.city,
            venue: parsed.venue,
            address: parsed.address,
            eventUrl: parsed.eventUrl,
            priceType: parsed.priceType ?? 'FREE',
            priceText: parsed.priceText ?? 'Бесплатно',
            speaker: parsed.speaker,
            mainEvent: parsed.mainEvent,
            sourcePostUrl,
            sourceChannelUrl,
            lastSyncedAt: new Date(),
            status: existing.isManualStatus ? existing.status : status,
            publishedAt:
              existing.isManualStatus
                ? existing.publishedAt
                : status === 'PUBLISHED'
                  ? existing.publishedAt ?? new Date()
                  : null,
            directions: {
              deleteMany: {},
              create: directionIds.map((directionId) => ({ directionId })),
            },
            tags: {
              deleteMany: {},
              create: parsed.tags.map((tag) => ({ tag })),
            },
          },
        });

        log.updated++;
        log.errorDetail.push({ type: 'UPDATED', detail: `externalId=${externalId}, status=${status}` });
        if (parsed.needsAttention || !hasValidImage) {
          await this.notifyAdminNeedsAttention(parsed.title, parsed.attentionReasons);
        }
        return;
      }

      const event = await this.prisma.event.create({
        data: {
          title: parsed.title ?? 'Без названия',
          shortDescription: parsed.shortDescription,
          fullDescription: parsed.fullDescription,
          startDate: parsed.startDate ?? postDate ?? new Date(),
          endDate: parsed.endDate,
          startTime: parsed.startTime,
          timezone: parsed.timezone,
          format: parsed.format ?? 'ONLINE',
          isOnline: parsed.format === 'ONLINE',
          cityName: parsed.city,
          venue: parsed.venue,
          address: parsed.address,
          eventUrl: parsed.eventUrl,
          priceType: parsed.priceType ?? 'FREE',
          priceText: parsed.priceText ?? 'Бесплатно',
          speaker: parsed.speaker,
          mainEvent: parsed.mainEvent,
          source: 'MAX',
          externalId,
          sourcePostUrl,
          sourceChannelUrl,
          lastSyncedAt: new Date(),
          status: 'DRAFT',
          directions: directionIds.length
            ? { create: directionIds.map((directionId) => ({ directionId })) }
            : undefined,
          tags: parsed.tags.length ? { create: parsed.tags.map((tag) => ({ tag })) } : undefined,
        },
      });

      let hasValidImage = false;
      if (imageAttachment) {
        hasValidImage = await this.downloadAndStoreImage(
          event.id,
          imageAttachment.payload as MaxAttachmentPayload | undefined,
          log,
        );
        if (!hasValidImage) this.addAttention(parsed, 'Изображение не удалось загрузить или обработать');
      }

      const finalStatus = parsed.needsAttention || !hasValidImage ? 'NEEDS_ATTENTION' : 'PUBLISHED';
      await this.prisma.event.update({
        where: { id: event.id },
        data: {
          status: finalStatus,
          publishedAt: finalStatus === 'PUBLISHED' ? new Date() : null,
        },
      });

      log.imported++;
      log.errorDetail.push({ type: 'IMPORTED', detail: `externalId=${externalId}, status=${finalStatus}` });
      if (finalStatus === 'NEEDS_ATTENTION') {
        await this.notifyAdminNeedsAttention(parsed.title, parsed.attentionReasons);
      }
    } catch (error) {
      log.errors++;
      log.errorDetail.push({ type: 'PARSE_ERROR', detail: `DB error for ${externalId}: ${String(error)}` });
      this.logger.error(`Error processing MAX message ${externalId}: ${error}`);
    }
  }

  private async handleMessageRemoved(update: MaxMessageRemovedUpdate, log: ImportLog): Promise<void> {
    const sourceChannelId = this.sourceChannelId();
    if (sourceChannelId === null || update.chatId !== sourceChannelId) {
      log.skipped++;
      return;
    }

    const existing = await this.prisma.event.findFirst({
      where: { source: 'MAX', externalId: update.messageId },
    });
    if (!existing) {
      log.skipped++;
      return;
    }

    if (!existing.isManualStatus) {
      await this.prisma.event.update({ where: { id: existing.id }, data: { status: 'HIDDEN' } });
    }
    log.updated++;
    log.errorDetail.push({ type: 'REMOVED', detail: `externalId=${update.messageId}` });
  }

  private async resolveDirectionIds(slugs: string[]): Promise<string[]> {
    if (!slugs.length) return [];
    const directions = await this.prisma.direction.findMany({
      where: { slug: { in: slugs }, isActive: true },
      select: { id: true },
    });
    return directions.map((direction) => direction.id);
  }

  private addAttention(parsed: ParsedMaxPost, reason: string) {
    parsed.needsAttention = true;
    if (!parsed.attentionReasons.includes(reason)) parsed.attentionReasons.push(reason);
  }

  private async downloadAndStoreImage(
    eventId: string,
    payload: MaxAttachmentPayload | undefined,
    log: ImportLog,
  ): Promise<boolean> {
    const url = payload?.url;
    if (!url) {
      log.errors++;
      log.errorDetail.push({ type: 'MEDIA_ERROR', detail: 'MAX image attachment has no URL' });
      return false;
    }

    try {
      const token = this.token();
      const response = await fetch(url, {
        headers: token ? this.maxHeaders(token) : {},
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        log.errors++;
        log.errorDetail.push({ type: 'MEDIA_ERROR', detail: `Image HTTP ${response.status} from ${url}` });
        return false;
      }

      const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!ALLOWED_IMAGE_MIME.has(contentType)) {
        log.errors++;
        log.errorDetail.push({ type: 'MEDIA_ERROR', detail: `Rejected MIME ${contentType}` });
        return false;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        log.errors++;
        log.errorDetail.push({ type: 'MEDIA_ERROR', detail: `Image too large: ${buffer.byteLength} bytes` });
        return false;
      }

      const uploadsDir = join(process.cwd(), 'uploads', 'events');
      await mkdir(uploadsDir, { recursive: true });
      const baseName = `max-${eventId}-${Date.now()}`;
      const originalExt = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1] || 'bin';
      const originalName = `${baseName}-original.${originalExt}`;
      const cardName = `${baseName}-card.webp`;
      const mainName = `${baseName}-main.webp`;
      const modalName = `${baseName}-modal.webp`;
      const thumbName = `${baseName}-thumb.webp`;

      await writeFile(join(uploadsDir, originalName), buffer);
      const source = sharp(buffer, { animated: false }).rotate();
      await Promise.all([
        source.clone().resize(1200, 675, { fit: 'cover', position: 'attention' }).webp({ quality: 88 }).toFile(join(uploadsDir, cardName)),
        source.clone().resize(900, 1200, { fit: 'cover', position: 'attention' }).webp({ quality: 90 }).toFile(join(uploadsDir, mainName)),
        source.clone().resize(1600, 900, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toFile(join(uploadsDir, modalName)),
        source.clone().resize(480, 270, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toFile(join(uploadsDir, thumbName)),
      ]);

      const publicPath = (filename: string) => `/uploads/events/${filename}`;
      await this.prisma.eventImage.upsert({
        where: { eventId },
        update: {
          originalUrl: publicPath(originalName),
          eventCardUrl: publicPath(cardName),
          mainEventUrl: publicPath(mainName),
          modalUrl: publicPath(modalName),
          thumbnailUrl: publicPath(thumbName),
        },
        create: {
          eventId,
          originalUrl: publicPath(originalName),
          eventCardUrl: publicPath(cardName),
          mainEventUrl: publicPath(mainName),
          modalUrl: publicPath(modalName),
          thumbnailUrl: publicPath(thumbName),
        },
      });
      return true;
    } catch (error) {
      log.errors++;
      log.errorDetail.push({ type: 'MEDIA_ERROR', detail: String(error) });
      this.logger.warn(`MAX image processing failed: ${error}`);
      return false;
    }
  }

  private async persistLog(log: ImportLog): Promise<void> {
    if (
      log.postsFound === 0 &&
      log.imported === 0 &&
      log.updated === 0 &&
      log.skipped === 0 &&
      log.errors === 0
    ) {
      return;
    }
    await this.prisma.maxImportLog.create({ data: log });
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
