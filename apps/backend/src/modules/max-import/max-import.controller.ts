import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MaxImportService } from './max-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAX_API_BASE = 'https://platform-api2.max.ru';

@ApiTags('max-import')
@Controller('max-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class MaxImportController {
  constructor(
    private readonly maxImportService: MaxImportService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Diagnostic: verify bot token and identity. */
  @Get('bot-info')
  async getBotInfo() {
    const tok = this.config.get<string>('MAX_BOT_TOKEN');
    if (!tok) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

    const res = await fetch(`${MAX_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${tok}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, httpStatus: res.status, error: res.statusText };
    return { ok: true, bot: await res.json() };
  }

  /**
   * Diagnostic: poll GET /updates?types=bot_added to retrieve the channel chatId.
   * Call this after adding the bot to the MAX channel to get the numeric chatId.
   * Set the returned chatId as MAX_SOURCE_CHANNEL_ID in env, then set MAX_IMPORT_ENABLED=true.
   */
  @Get('discover-channel')
  async discoverChannel() {
    const tok = this.config.get<string>('MAX_BOT_TOKEN');
    if (!tok) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

    const params = new URLSearchParams({ limit: '100', types: 'bot_added' });
    const res = await fetch(`${MAX_API_BASE}/updates?${params.toString()}`, {
      headers: { Authorization: `Bearer ${tok}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401) return { ok: false, error: 'HTTP 401 — token invalid or revoked' };
    if (res.status === 403) return { ok: false, error: 'HTTP 403 — access denied' };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };

    const data = await res.json() as { updates?: any[]; marker?: number };
    const botAddedEvents = (data.updates ?? []).filter((u: any) => u.updateType === 'bot_added');

    return {
      ok: true,
      marker: data.marker,
      botAddedCount: botAddedEvents.length,
      channels: botAddedEvents.map((u: any) => ({
        chatId: u.chatId ?? u.chat?.chatId,
        title: u.chat?.title,
        type: u.chat?.type,
        timestamp: u.timestamp,
      })),
      instruction: botAddedEvents.length > 0
        ? `Set MAX_SOURCE_CHANNEL_ID=<chatId from above> and MAX_IMPORT_ENABLED=true in env, then redeploy.`
        : `No bot_added events found yet. Ensure the bot was added to the channel, then retry.`,
    };
  }

  /** Manual import trigger — admin diagnostics only. */
  @Post('run')
  runManualImport() {
    return this.maxImportService.runManual();
  }

  @Get('logs')
  async getLogs() {
    return this.prisma.maxImportLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 50,
    });
  }
}
