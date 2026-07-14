import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MaxParserService } from './max-parser.service';
import { MAX_CHANNEL } from '@ab-afisha/shared';
import {
  normalizeMaxUpdate,
  type MaxUpdate,
  type MaxMessageCreatedUpdate,
  type MaxBotAddedUpdate,
  type RawMaxUpdatesResponse,
  type MaxAttachmentPayload,
} from './max-api.types';

const MAX_API_BASE = 'https://platform-api2.max.ru';

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

type LogEntryType =
  | 'FETCH_ERROR'
  | 'AUTH_ERROR'
  | 'SOURCE_NOT_FOUND'
  | 'UNSUPPORTED_EVENT'
  | 'PARSE_ERROR'
  | 'MEDIA_ERROR'
  | 'IMPORTED'
  | 'UPDATED'
  | 'SKIPPED_DUPLICATE'
  | 'CHANNEL_MISMATCH';

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
  private pollMarker: number | undefined = undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: MaxParserService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Hourly heartbeat — logs import status only.
   * Webhook is the primary ingestion path; polling is NOT run on schedule.
   * Use POST /api/max-import/run for a diagnostic manual poll.
   */
  @Cron('0 * * * *')
  runHeartbeat() {
    if (!this.isEnabled()) {
      this.logger.debug('MAX import disabled (MAX_IMPORT_ENABLED != true)');
      return;
    }
    this.logger.log('MAX import enabled — webhook is primary ingestion path');
  }

  /** Called by the webhook controller for each inbound MAX update. Raw payload normalized here. */
  async processWebhookUpdate(rawPayload: unknown): Promise<void> {
    const update = normalizeMaxUpdate(rawPayload);
    if (!update) {
      this.logger.warn('Webhook: missing or invalid update_type in payload, ignoring');
      return;
    }

    const log = this.emptyLog();
    log.postsFound = 1;
    await this.dispatchUpdate(update, log);

    if (log.imported > 0 || log.updated > 0 || log.errors > 0) {
      await this.prisma.maxImportLog.create({ data: log });
    }
  }

  /**
   * Admin diagnostic: polls GET /updates for missed events.
   * Not intended as a continuous production mechanism.
   */
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

    const log = this.emptyLog();
    try {
      const updates = await this.pollUpdates(log);
      log.postsFound = updates.length;
      for (const update of updates) {
        await this.dispatchUpdate(update, log);
      }
    } catch (err) {
      log.errors++;
      log.errorDetail.push({ type: 'FETCH_ERROR', detail: String(err) });
    }
    return { log };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private isEnabled(): boolean {
    return this.config.get<string>('MAX_IMPORT_ENABLED') === 'true';
  }

  private emptyLog(): ImportLog {
    return { postsFound: 0, imported: 0, updated: 0, skipped: 0, errors: 0, errorDetail: [] };
  }

  private sourceChannelId(): number | null {
    const raw = this.config.get<string>('MAX_SOURCE_CHANNEL_ID');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }

  private token(): string | null {
    return this.config.get<string>('MAX_BOT_TOKEN') ?? null;
  }

  private maxHeaders(tok: string): Record<string, string> {
    // MAX API uses bare token: Authorization: <token> — no "Bearer" prefix
    return { Authorization: tok };
  }

  /** GET /updates — manual diagnostic poll with marker tracking. */
  private async pollUpdates(log: ImportLog): Promise<MaxUpdate[]> {
    const tok = this.token();
    if (!tok) {
      log.errors++;
      log.errorDetail.push({ type: 'AUTH_ERROR', detail: 'MAX_BOT_TOKEN not set' });
      return [];
    }

    const params = new URLSearchParams({
      limit: '100',
      types: 'message_created,message_edited,message_removed,bot_added,bot_removed',
    });
    if (this.pollMarker !== undefined) {
      params.set('marker', String(this.pollMarker));
    }

    const res = await fetch(`${MAX_API_BASE}/updates?${params.toString()}`, {
      headers: this.maxHeaders(tok),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 401) {
      log.errors++;
      log.errorDetail.push({ type: 'AUTH_ERROR', detail: 'HTTP 401 — token invalid or revoked' });
      return [];
    }
    if (res.status === 403) {
      log.errors++;
      log.errorDetail.push({ type: 'AUTH_ERROR', detail: 'HTTP 403 — access denied' });
      return [];
    }
    if (!res.ok) {
      log.errors++;
      log.errorDetail.push({ type: 'FETCH_ERROR', detail: `HTTP ${res.status} ${res.statusText}` });
      return [];
    }

    const data = (await res.json()) as RawMaxUpdatesResponse;
    if (data.marker !== undefined) {
      this.pollMarker = data.marker;
    }

    // Normalize raw snake_case updates at the polling boundary
    return (data.updates ?? [])
      .map((raw) => normalizeMaxUpdate(raw))
      .filter((u): u is MaxUpdate => u !== null);
  }

  private async dispatchUpdate(update: MaxUpdate, log: ImportLog): Promise<void> {
    const type = update.updateType;

    if (type === 'bot_added') {
      await this.handleBotAdded(update as MaxBotAddedUpdate);
      return;
    }

    if (type === 'message_created') {
      await this.handleMessageCreated(update as MaxMessageCreatedUpdate, log);
      return;
    }

    if (type === 'message_edited') {
      log.skipped++;
      return;
    }

    log.skipped++;
    log.errorDetail.push({ type: 'UNSUPPORTED_EVENT', detail: type });
  }

  private async handleBotAdded(update: MaxBotAddedUpdate): Promise<void> {
    const chatId = update.chatId;
    const isChannel = update.isChannel ? ' (channel)' : '';
    this.logger.warn(
      `Bot added to chat. chat_id=${chatId}${isChannel}. ` +
      `Set MAX_SOURCE_CHANNEL_ID=${chatId} in env to enable import from this channel.`,
    );
    await this.notifyAdminError(
      `MAX bot добавлен в чат chat_id=${chatId}${isChannel}. ` +
      `Если это нужный канал — установите MAX_SOURCE_CHANNEL_ID=${chatId} в конфигурации.`,
    );
  }

  private async handleMessageCreated(update: MaxMessageCreatedUpdate, log: ImportLog): Promise<void> {
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

    const mid = update.message?.body?.mid;
    const externalId = mid ?? '';
    const text = update.message?.body?.text ?? '';
    const timestamp = update.message?.timestamp;
    const postDate = timestamp ? new Date(timestamp) : undefined;

    if (!externalId) {
      log.errors++;
      log.errorDetail.push({ type: 'PARSE_ERROR', detail: 'Empty message mid (externalId)' });
      return;
    }

    if (this.parser.isCollectionPost(text)) {
      log.skipped++;
      return;
    }

    const sourceChannelUrl = this.config.get<string>('MAX_SOURCE_CHANNEL_URL') ?? MAX_CHANNEL;
    const sourcePostUrl = `${sourceChannelUrl}?mid=${encodeURIComponent(externalId)}`;

    let parsed;
    try {
      parsed = this.parser.parse(text, postDate);
    } catch (err) {
      log.errors++;
      log.errorDetail.push({ type: 'PARSE_ERROR', detail: String(err) });
      return;
    }

    const status = parsed.needsAttention ? 'NEEDS_ATTENTION' : 'DRAFT';

    try {
      const existing = await this.prisma.event.findFirst({
        where: { source: 'MAX', externalId },
      });

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
        log.errorDetail.push({ type: 'UPDATED', detail: `externalId=${externalId}` });
      } else {
        const event = await this.prisma.event.create({
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
            sourceChannelUrl,
            status,
            tags: parsed.tags.length ? { create: parsed.tags.map((tag) => ({ tag })) } : undefined,
          },
        });
        log.imported++;
        log.errorDetail.push({ type: 'IMPORTED', detail: `externalId=${externalId}` });

        if (parsed.needsAttention) {
          await this.notifyAdminNeedsAttention(parsed.title, parsed.attentionReasons);
        }

        const attachments = update.message?.body?.attachments ?? [];
        for (const att of attachments) {
          if (att.type === 'image') {
            await this.downloadAndStoreImage(event.id, att.payload as MaxAttachmentPayload | undefined, log);
          }
        }
      }
    } catch (err) {
      log.errors++;
      log.errorDetail.push({ type: 'PARSE_ERROR', detail: `DB error for ${externalId}: ${String(err)}` });
      this.logger.error(`Error processing message ${externalId}: ${err}`);
    }
  }

  private async downloadAndStoreImage(
    eventId: string,
    payload: MaxAttachmentPayload | undefined,
    log: ImportLog,
  ): Promise<void> {
    const url = payload?.url;
    if (!url) return;

    try {
      const tok = this.token();
      const headers: Record<string, string> = {};
      if (tok) headers['Authorization'] = tok; // no "Bearer" prefix

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        log.errorDetail.push({ type: 'MEDIA_ERROR', detail: `Image HTTP ${res.status} from ${url}` });
        return;
      }

      const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!ALLOWED_IMAGE_MIME.has(contentType)) {
        log.errorDetail.push({ type: 'MEDIA_ERROR', detail: `Rejected MIME ${contentType}` });
        return;
      }

      const bytes = await res.arrayBuffer();
      if (bytes.byteLength > MAX_IMAGE_BYTES) {
        log.errorDetail.push({ type: 'MEDIA_ERROR', detail: `Image too large: ${bytes.byteLength} bytes` });
        return;
      }

      const ext = contentType.split('/')[1] ?? 'jpg';
      const filename = `max-${eventId}-${Date.now()}.${ext}`;
      const uploadsDir = join(process.cwd(), 'uploads', 'events');
      mkdirSync(uploadsDir, { recursive: true });
      const dest = join(uploadsDir, filename);

      await new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(dest);
        ws.on('finish', resolve);
        ws.on('error', reject);
        ws.write(Buffer.from(bytes));
        ws.end();
      });

      await this.prisma.eventImage.create({
        data: { eventId, originalUrl: `/uploads/events/${filename}` },
      });
    } catch (err) {
      log.errorDetail.push({ type: 'MEDIA_ERROR', detail: String(err) });
      this.logger.warn(`Image download failed: ${err}`);
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
