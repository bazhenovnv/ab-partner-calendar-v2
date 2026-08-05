import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MaxReliableImportService } from './max-reliable-import.service';
import { MaxImportRecoveryService } from './max-import-recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeMaxUpdate } from './max-api.types';

const MAX_API_BASE = 'https://platform-api2.max.ru';

@ApiTags('max-import')
@Controller('max-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class MaxImportController {
  constructor(
    private readonly maxImportService: MaxReliableImportService,
    private readonly maxImportRecovery: MaxImportRecoveryService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('bot-info')
  async getBotInfo() {
    const tok = this.config.get<string>('MAX_BOT_TOKEN');
    if (!tok) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

    const res = await fetch(`${MAX_API_BASE}/me`, {
      headers: { Authorization: tok },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, httpStatus: res.status, error: res.statusText };
    return { ok: true, bot: await res.json() };
  }

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
      .map((update) => normalizeMaxUpdate(update))
      .filter((update) => update?.updateType === 'bot_added') as Array<{
        updateType: 'bot_added';
        chatId: number;
        isChannel?: boolean;
        timestamp: number;
      }>;

    return {
      ok: true,
      marker: data.marker,
      botAddedCount: botAddedUpdates.length,
      channels: botAddedUpdates.map((update) => ({
        chatId: update.chatId,
        isChannel: update.isChannel,
        timestamp: update.timestamp,
      })),
      instruction: botAddedUpdates.length > 0
        ? 'Set MAX_SOURCE_CHANNEL_ID=<chatId> and MAX_IMPORT_ENABLED=true in env, then redeploy.'
        : 'No bot_added events found. Ensure the bot was added after the webhook was registered, then retry.',
    };
  }

  /** Poll the MAX queue and acknowledge the marker only after durable processing. */
  @Post('run')
  async runManualImport(): Promise<unknown> {
    return this.maxImportService.runReliableManual();
  }

  /** Replay the latest MAX update window without changing the stored marker. */
  @Post('backfill-recent')
  async backfillRecent(): Promise<unknown> {
    return this.maxImportService.runRecentBackfill(true);
  }

  /** Reparse and republish stored non-manual MAX drafts after parser changes. */
  @Post('reprocess')
  async reprocessPending(): Promise<unknown> {
    return this.maxImportRecovery.reprocessPending();
  }

  @Get('logs')
  async getLogs() {
    return this.prisma.maxImportLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 50,
    });
  }
}
