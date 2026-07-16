import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MaxImportService } from './max-import.service';
import { MaxBackfillService } from './max-backfill.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeMaxUpdate } from './max-api.types';

// MAX API uses bare token — no "Bearer" prefix
const MAX_API_BASE = 'https://platform-api2.max.ru';

@ApiTags('max-import')
@Controller('max-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class MaxImportController {
  constructor(
    private readonly maxImportService: MaxImportService,
    private readonly maxBackfillService: MaxBackfillService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Verify bot token is valid and show bot identity. */
  @Get('bot-info')
  async getBotInfo() {
    const tok = this.config.get<string>('MAX_BOT_TOKEN');
    if (!tok) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

    // MAX API: Authorization: <token>  (no "Bearer" prefix)
    const res = await fetch(`${MAX_API_BASE}/me`, {
      headers: { Authorization: tok },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, httpStatus: res.status, error: res.statusText };
    return { ok: true, bot: await res.json() };
  }

  /**
   * Discover channel chatId after adding the bot as admin.
   *
   * IMPORTANT: GET /chats is deprecated since June 2026.
   * Supported method: poll GET /updates?types=bot_added.
   */
  @Get('discover-channel')
  async discoverChannel() {
    const tok = this.config.get<string>('MAX_BOT_TOKEN');
    if (!tok) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

    const params = new URLSearchParams({ limit: '100', types: 'bot_added' });
    const res = await fetch(`${MAX_API_BASE}/updates?${params.toString()}`, {
      headers: { Authorization: tok },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401) return { ok: false, error: 'HTTP 401 — token invalid or revoked' };
    if (res.status === 403) return { ok: false, error: 'HTTP 403 — access denied' };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };

    const data = await res.json() as { updates?: unknown[]; marker?: number };
    const rawUpdates = data.updates ?? [];
    const botAddedUpdates = rawUpdates
      .map((u) => normalizeMaxUpdate(u))
      .filter((u) => u?.updateType === 'bot_added') as Array<{
        updateType: 'bot_added'; chatId: number; isChannel?: boolean; timestamp: number;
      }>;

    return {
      ok: true,
      marker: data.marker,
      botAddedCount: botAddedUpdates.length,
      channels: botAddedUpdates.map((u) => ({
        chatId: u.chatId,
        isChannel: u.isChannel,
        timestamp: u.timestamp,
      })),
      instruction: botAddedUpdates.length > 0
        ? 'Set MAX_SOURCE_CHANNEL_ID=<chatId> and MAX_IMPORT_ENABLED=true in env, then redeploy.'
        : 'No bot_added events found. Ensure the bot was added AFTER the webhook was registered, then retry.',
    };
  }

  /** Manual diagnostic: polls GET /updates for any missed events. */
  @Post('run')
  async runManualImport(): Promise<unknown> {
    return this.maxImportService.runManual();
  }

  /**
   * Initial/resumable import of channel history through official GET /messages.
   * Repeated execution is safe: source + externalId prevents duplicate Event rows.
   */
  @Post('backfill')
  @ApiQuery({ name: 'maxPages', required: false, type: Number, description: 'Pages per run, 1..500; default 25' })
  @ApiQuery({ name: 'reset', required: false, type: Boolean, description: 'Restart from current time or explicit from cursor' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Upper time cursor: Unix ms or ISO date' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Lower time boundary: Unix ms or ISO date' })
  async runBackfill(
    @Query('maxPages') maxPages?: string,
    @Query('reset') reset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.maxBackfillService.run({
      maxPages: maxPages ? Number(maxPages) : undefined,
      reset: reset === 'true' || reset === '1',
      from: from ? this.parseTimestamp(from) : undefined,
      to: to ? this.parseTimestamp(to) : undefined,
    });
  }

  @Get('backfill-status')
  async getBackfillStatus() {
    return { state: await this.maxBackfillService.getState() };
  }

  @Get('logs')
  async getLogs() {
    return this.prisma.maxImportLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 50,
    });
  }

  private parseTimestamp(value: string): number | undefined {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
