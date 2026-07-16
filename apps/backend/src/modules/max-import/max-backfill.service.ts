import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MaxImportService } from './max-import.service';

const MAX_API_BASE = 'https://platform-api2.max.ru';
const PAGE_SIZE = 100;
const STATE_KEY = 'maxImport.backfillState';
const MAX_PAGES_PER_RUN = 500;

interface RawHistoryMessage {
  timestamp?: number;
  recipient?: { chat_id?: number };
  body?: { mid?: string; text?: string; attachments?: unknown[] };
  [key: string]: unknown;
}

interface RawHistoryResponse {
  messages?: RawHistoryMessage[];
}

interface BackfillState {
  cursor: number | null;
  lowerBound: number | null;
  pagesProcessed: number;
  messagesProcessed: number;
  completed: boolean;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BackfillOptions {
  maxPages?: number;
  reset?: boolean;
  from?: number;
  to?: number;
}

export interface BackfillResult {
  ok: boolean;
  pagesFetched: number;
  messagesFound: number;
  processed: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  completed: boolean;
  nextCursor: number | null;
  state: BackfillState;
}

@Injectable()
export class MaxBackfillService {
  private readonly logger = new Logger(MaxBackfillService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly maxImportService: MaxImportService,
  ) {}

  async getState(): Promise<BackfillState | null> {
    const record = await this.prisma.siteConfig.findUnique({ where: { key: STATE_KEY } });
    return this.parseState(record?.value);
  }

  async run(options: BackfillOptions = {}): Promise<BackfillResult> {
    if (this.running) {
      const state = (await this.getState()) ?? this.newState(null, null);
      return {
        ok: false,
        pagesFetched: 0,
        messagesFound: 0,
        processed: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: ['MAX history backfill is already running'],
        completed: state.completed,
        nextCursor: state.cursor,
        state,
      };
    }

    const token = this.config.get<string>('MAX_BOT_TOKEN');
    const sourceIdRaw = this.config.get<string>('MAX_SOURCE_CHANNEL_ID');
    const sourceId = sourceIdRaw ? Number.parseInt(sourceIdRaw, 10) : Number.NaN;
    if (!token || !Number.isFinite(sourceId)) {
      const state = (await this.getState()) ?? this.newState(null, null);
      return {
        ok: false,
        pagesFetched: 0,
        messagesFound: 0,
        processed: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [!token ? 'MAX_BOT_TOKEN not set' : 'MAX_SOURCE_CHANNEL_ID not configured'],
        completed: false,
        nextCursor: state.cursor,
        state,
      };
    }

    this.running = true;
    try {
      const maxPages = this.clamp(options.maxPages ?? 25, 1, MAX_PAGES_PER_RUN);
      const lowerBound = this.normalizeTimestamp(options.to) ?? null;
      const explicitCursor = this.normalizeTimestamp(options.from);
      const savedState = options.reset ? null : await this.getState();
      let state = savedState ?? this.newState(explicitCursor ?? Date.now() + 1, lowerBound);

      if (options.reset || explicitCursor !== undefined || state.completed) {
        state = this.newState(explicitCursor ?? Date.now() + 1, lowerBound);
      }
      if (lowerBound !== null) state.lowerBound = lowerBound;

      const result: BackfillResult = {
        ok: true,
        pagesFetched: 0,
        messagesFound: 0,
        processed: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        completed: false,
        nextCursor: state.cursor,
        state,
      };

      let cursor = state.cursor ?? Date.now() + 1;
      for (let page = 0; page < maxPages; page += 1) {
        const messages = await this.fetchPage(token, sourceId, cursor, state.lowerBound);
        result.pagesFetched += 1;
        result.messagesFound += messages.length;

        if (messages.length === 0) {
          state.completed = true;
          state.completedAt = new Date().toISOString();
          break;
        }

        let oldestTimestamp = cursor;
        for (const message of messages) {
          const timestamp = this.normalizeTimestamp(message.timestamp);
          const externalId = message.body?.mid;
          if (timestamp === undefined || !externalId) {
            result.skipped += 1;
            continue;
          }
          if (state.lowerBound !== null && timestamp < state.lowerBound) {
            state.completed = true;
            state.completedAt = new Date().toISOString();
            continue;
          }

          oldestTimestamp = Math.min(oldestTimestamp, timestamp);
          const existing = await this.prisma.event.findFirst({
            where: { source: 'MAX', externalId },
            select: { id: true },
          });

          try {
            await this.maxImportService.processWebhookUpdate({
              update_type: 'message_created',
              timestamp,
              message,
            });
            result.processed += 1;
            if (existing) result.updated += 1;
            else result.imported += 1;
          } catch (error) {
            result.errors.push(`mid=${externalId}: ${String(error)}`);
          }
        }

        if (oldestTimestamp >= cursor) {
          result.errors.push(`Pagination cursor did not advance from ${cursor}`);
          result.ok = false;
          break;
        }

        cursor = oldestTimestamp - 1;
        state.cursor = cursor;
        state.pagesProcessed += 1;
        state.messagesProcessed += messages.length;
        state.updatedAt = new Date().toISOString();
        await this.saveState(state);

        if (state.completed || messages.length < PAGE_SIZE) {
          state.completed = true;
          state.completedAt = state.completedAt ?? new Date().toISOString();
          break;
        }
      }

      state.updatedAt = new Date().toISOString();
      await this.saveState(state);
      result.completed = state.completed;
      result.nextCursor = state.cursor;
      result.state = state;

      this.logger.log(
        `MAX backfill: pages=${result.pagesFetched}, found=${result.messagesFound}, ` +
          `processed=${result.processed}, imported=${result.imported}, updated=${result.updated}, ` +
          `skipped=${result.skipped}, errors=${result.errors.length}, completed=${result.completed}`,
      );
      return result;
    } finally {
      this.running = false;
    }
  }

  private async fetchPage(
    token: string,
    chatId: number,
    cursor: number,
    lowerBound: number | null,
  ): Promise<RawHistoryMessage[]> {
    const params = new URLSearchParams({
      chat_id: String(chatId),
      count: String(PAGE_SIZE),
      from: String(cursor),
    });
    if (lowerBound !== null) params.set('to', String(lowerBound));

    const response = await fetch(`${MAX_API_BASE}/messages?${params.toString()}`, {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`MAX GET /messages HTTP ${response.status}: ${body || response.statusText}`);
    }

    const data = (await response.json()) as RawHistoryResponse;
    return Array.isArray(data.messages) ? data.messages : [];
  }

  private newState(cursor: number | null, lowerBound: number | null): BackfillState {
    const now = new Date().toISOString();
    return {
      cursor,
      lowerBound,
      pagesProcessed: 0,
      messagesProcessed: 0,
      completed: false,
      startedAt: now,
      updatedAt: now,
    };
  }

  private parseState(value: unknown): BackfillState | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const state = value as Partial<BackfillState>;
    if (typeof state.startedAt !== 'string' || typeof state.updatedAt !== 'string') return null;
    return {
      cursor: typeof state.cursor === 'number' ? state.cursor : null,
      lowerBound: typeof state.lowerBound === 'number' ? state.lowerBound : null,
      pagesProcessed: typeof state.pagesProcessed === 'number' ? state.pagesProcessed : 0,
      messagesProcessed: typeof state.messagesProcessed === 'number' ? state.messagesProcessed : 0,
      completed: state.completed === true,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      completedAt: typeof state.completedAt === 'string' ? state.completedAt : undefined,
    };
  }

  private async saveState(state: BackfillState): Promise<void> {
    await this.prisma.siteConfig.upsert({
      where: { key: STATE_KEY },
      update: { value: state },
      create: { key: STATE_KEY, value: state },
    });
  }

  private normalizeTimestamp(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
    if (typeof value === 'string' && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.floor(value)));
  }
}
