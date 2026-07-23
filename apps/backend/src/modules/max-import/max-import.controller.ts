import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MaxImportService } from './max-import.service';
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
   *
   * Prerequisite procedure (must be done in this order):
   *   1. Deploy this backend (webhook endpoint live)
   *   2. Register the webhook subscription (POST /subscriptions, see docs)
   *   3. Remove the bot from the MAX channel (if already added before step 1-2)
   *   4. Re-add the bot as administrator
   *   5. Call this endpoint — it polls for the bot_added event and returns chat_id
   *   6. Set MAX_SOURCE_CHANNEL_ID=<chat_id> and MAX_IMPORT_ENABLED=true
   *   7. Redeploy backend
   */
  @Get('discover-channel')
  async discoverChannel() {
    const tok = this.config.get<string>('MAX_BOT_TOKEN');
    if (!tok) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

    const params = new URLSearchParams({ limit: '100', types: 'bot_added' });
    const res = await fetch(`${MAX_API_BASE}/updates?${params.toString()}`, {
      headers: { Authorization: tok }, // no "Bearer"
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
        ? `Set MAX_SOURCE_CHANNEL_ID=<chatId> and MAX_IMPORT_ENABLED=true in env, then redeploy.`
        : `No bot_added events found. Ensure the bot was added AFTER the webhook was registered, then retry.`,
    };
  }

  /** Manual diagnostic: polls GET /updates for any missed events. */
  @Post('run')
  async runManualImport(): Promise<unknown> {
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
