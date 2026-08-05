import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MaxParserService } from './max-parser.service';
import { MaxImportService } from './max-import.service';
import {
  normalizeMaxUpdate,
  type MaxMessageCreatedUpdate,
  type MaxMessageEditedUpdate,
  type RawMaxUpdatesResponse,
} from './max-api.types';

const MAX_API_BASE = 'https://platform-api2.max.ru';
const POLL_MARKER_KEY = 'maxImport.pollMarker';
const RECENT_BACKFILL_KEY = 'maxImport.recentBackfillV3';

type ReliableImportLog = {
  postsFound: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetail: Array<{ type: string; detail: string }>;
};

@Injectable()
export class MaxReliableImportService extends MaxImportService {
  private readonly reliableLogger = new Logger(MaxReliableImportService.name);
  private reliablePollInProgress = false;

  constructor(
    private readonly reliablePrisma: PrismaService,
    parser: MaxParserService,
    private readonly reliableConfig: ConfigService,
  ) {
    super(reliablePrisma, parser, reliableConfig);
  }

  @Cron('0 * * * *', { timeZone: 'Europe/Moscow' })
  override async runHeartbeat(): Promise<void> {
    if (!this.isReliableImportEnabled()) {
      this.reliableLogger.debug(
        'MAX import disabled (MAX_IMPORT_ENABLED != true)',
      );
      return;
    }

    const { log } = await this.runManual();
    this.reliableLogger.log(
      `MAX reliable hourly sync: found=${log.postsFound}, ` +
        `imported=${log.imported}, updated=${log.updated}, ` +
        `skipped=${log.skipped}, errors=${log.errors}`,
    );
  }

  override async runManual(): Promise<{ log: ReliableImportLog }> {
    if (!this.isReliableImportEnabled()) {
      return {
        log: {
          ...this.emptyReliableLog(),
          errors: 1,
          errorDetail: [
            {
              type: 'FETCH_ERROR',
              detail: 'MAX_IMPORT_ENABLED is false',
            },
          ],
        },
      };
    }

    return this.runReliableCycle(true);
  }

  /**
   * Replays the latest available MAX update window once after this importer
   * revision is deployed. This recovers recent posts that were skipped after
   * the old implementation acknowledged its marker too early.
   */
  async runRecentBackfill(
    force = false,
  ): Promise<{ skipped: boolean; log: ReliableImportLog }> {
    if (!this.isReliableImportEnabled()) {
      return {
        skipped: true,
        log: {
          ...this.emptyReliableLog(),
          errors: 1,
          errorDetail: [
            {
              type: 'FETCH_ERROR',
              detail: 'MAX_IMPORT_ENABLED is false',
            },
          ],
        },
      };
    }

    if (!force) {
      const completed = await this.reliablePrisma.siteConfig.findUnique({
        where: { key: RECENT_BACKFILL_KEY },
      });
      if (completed?.value === true) {
        return { skipped: true, log: this.emptyReliableLog() };
      }
    }

    const result = await this.runReliableCycle(false);
    if (result.log.errors === 0) {
      await this.reliablePrisma.siteConfig.upsert({
        where: { key: RECENT_BACKFILL_KEY },
        update: { value: true },
        create: { key: RECENT_BACKFILL_KEY, value: true },
      });
    }

    return { skipped: false, log: result.log };
  }

  private async runReliableCycle(
    useStoredMarker: boolean,
  ): Promise<{ log: ReliableImportLog }> {
    const log = this.emptyReliableLog();

    if (this.reliablePollInProgress) {
      log.skipped++;
      log.errorDetail.push({
        type: 'RUN_SKIPPED',
        detail: 'Previous reliable MAX poll is still running',
      });
      return { log };
    }

    this.reliablePollInProgress = true;
    try {
      const storedMarker = useStoredMarker
        ? await this.readStoredMarker()
        : undefined;
      const batch = await this.fetchRawUpdates(storedMarker);
      log.postsFound = batch.updates.length;

      for (const rawUpdate of batch.updates) {
        await this.processDurably(rawUpdate, log);
      }

      if (
        useStoredMarker &&
        batch.marker !== undefined &&
        log.errors === 0
      ) {
        await this.saveStoredMarker(batch.marker);
      }
    } catch (error) {
      log.errors++;
      log.errorDetail.push({
        type: 'FETCH_ERROR',
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.reliablePollInProgress = false;
    }

    return { log };
  }

  private async processDurably(
    rawUpdate: unknown,
    log: ReliableImportLog,
  ): Promise<void> {
    const update = normalizeMaxUpdate(rawUpdate);
    if (!update) {
      log.skipped++;
      log.errorDetail.push({
        type: 'UNSUPPORTED_EVENT',
        detail: 'Invalid MAX update payload',
      });
      return;
    }

    if (
      update.updateType !== 'message_created' &&
      update.updateType !== 'message_edited'
    ) {
      await this.processWebhookUpdate(rawUpdate);
      log.updated++;
      return;
    }

    const messageUpdate = update as
      | MaxMessageCreatedUpdate
      | MaxMessageEditedUpdate;
    const sourceChannelId = this.sourceChannelId();
    const chatId = messageUpdate.message.recipient.chatId;

    if (sourceChannelId === null) {
      log.errors++;
      log.errorDetail.push({
        type: 'SOURCE_NOT_FOUND',
        detail: 'MAX_SOURCE_CHANNEL_ID not configured',
      });
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

    const externalId = messageUpdate.message.body.mid;
    if (!externalId) {
      log.errors++;
      log.errorDetail.push({
        type: 'PARSE_ERROR',
        detail: 'Empty message mid (externalId)',
      });
      return;
    }

    const existingBefore = await this.reliablePrisma.event.findFirst({
      where: { source: 'MAX', externalId },
      select: { id: true },
    });
    const processingStartedAt = new Date(Date.now() - 1_000);

    await this.processWebhookUpdate(rawUpdate);

    const eventAfter = await this.reliablePrisma.event.findFirst({
      where: { source: 'MAX', externalId },
      include: { images: true },
    });

    if (
      !eventAfter ||
      !eventAfter.lastSyncedAt ||
      eventAfter.lastSyncedAt < processingStartedAt
    ) {
      log.errors++;
      log.errorDetail.push({
        type: 'DURABILITY_ERROR',
        detail: `MAX update ${externalId} was not durably synchronized`,
      });
      return;
    }

    const sourceHasImage = Boolean(
      messageUpdate.message.body.attachments?.some(
        (attachment) => attachment.type === 'image',
      ),
    );
    const storedHasImage = eventAfter.images.some((image) =>
      Boolean(
        image.eventCardUrl ||
          image.originalUrl ||
          image.thumbnailUrl ||
          image.mainEventUrl,
      ),
    );

    if (sourceHasImage && !storedHasImage) {
      log.errors++;
      log.errorDetail.push({
        type: 'MEDIA_ERROR',
        detail: `MAX image for ${externalId} was not stored`,
      });
      return;
    }

    if (existingBefore) log.updated++;
    else log.imported++;
  }

  private async fetchRawUpdates(
    marker?: number,
  ): Promise<{ updates: unknown[]; marker?: number }> {
    const token = this.reliableConfig.get<string>('MAX_BOT_TOKEN');
    if (!token) throw new Error('MAX_BOT_TOKEN not set');

    const params = new URLSearchParams({
      limit: '100',
      types:
        'message_created,message_edited,message_removed,bot_added,bot_removed',
    });
    if (marker !== undefined) params.set('marker', String(marker));

    const timeout = Number(
      this.reliableConfig.get<string>('MAX_IMPORT_TIMEOUT_MS') ?? '60000',
    );
    const response = await fetch(
      `${MAX_API_BASE}/updates?${params.toString()}`,
      {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(timeout),
      },
    );

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `MAX authorization failed: HTTP ${response.status}`,
      );
    }
    if (!response.ok) {
      throw new Error(
        `MAX updates failed: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as RawMaxUpdatesResponse;
    return {
      updates: data.updates ?? [],
      marker: data.marker,
    };
  }

  private async readStoredMarker(): Promise<number | undefined> {
    const config = await this.reliablePrisma.siteConfig.findUnique({
      where: { key: POLL_MARKER_KEY },
    });
    return typeof config?.value === 'number'
      ? config.value
      : undefined;
  }

  private async saveStoredMarker(marker: number): Promise<void> {
    await this.reliablePrisma.siteConfig.upsert({
      where: { key: POLL_MARKER_KEY },
      update: { value: marker },
      create: { key: POLL_MARKER_KEY, value: marker },
    });
  }

  private sourceChannelId(): number | null {
    const raw = this.reliableConfig.get<string>(
      'MAX_SOURCE_CHANNEL_ID',
    );
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  }

  private isReliableImportEnabled(): boolean {
    return (
      this.reliableConfig.get<string>('MAX_IMPORT_ENABLED') === 'true'
    );
  }

  private emptyReliableLog(): ReliableImportLog {
    return {
      postsFound: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetail: [],
    };
  }
}
