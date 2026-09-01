import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAX_API_BASE = 'https://platform-api2.max.ru';
const MAX_BATCH_SIZE = 100;

type MaxApiMessage = {
  recipient?: {
    chat_id?: number;
  };
  body?: {
    mid?: string;
  } | null;
  url?: string | null;
};

type MaxMessagesResponse = {
  messages?: MaxApiMessage[];
};

export type MaxSourcePostRepairResult = {
  scanned: number;
  repaired: number;
  unresolved: number;
  skipped: boolean;
};

@Injectable()
export class MaxSourcePostLinkService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaxSourcePostLinkService.name);
  private repairInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    void this.repairLegacyLinks().catch((error) => {
      this.logger.warn(
        `Initial MAX source-link repair failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  /**
   * MAX webhook/update payloads do not provide the canonical public post URL.
   * Resolve it from GET /messages by the stored message mid. Running every
   * minute also repairs a newly imported event after the legacy importer has
   * written its channel join URL.
   */
  @Cron('*/1 * * * *', { timeZone: 'Europe/Moscow' })
  async repairLegacyLinks(): Promise<MaxSourcePostRepairResult> {
    if (this.repairInProgress) {
      return { scanned: 0, repaired: 0, unresolved: 0, skipped: true };
    }

    const token = this.config.get<string>('MAX_BOT_TOKEN')?.trim();
    const sourceChannelId = this.getSourceChannelId();
    if (!token || sourceChannelId === null) {
      return { scanned: 0, repaired: 0, unresolved: 0, skipped: true };
    }

    this.repairInProgress = true;
    try {
      const events = await this.prisma.event.findMany({
        where: {
          source: 'MAX',
          externalId: { not: null },
          OR: [
            { sourcePostUrl: null },
            { sourcePostUrl: { contains: '/join/' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          externalId: true,
          sourcePostUrl: true,
        },
      });

      if (events.length === 0) {
        return { scanned: 0, repaired: 0, unresolved: 0, skipped: false };
      }

      const eventsByMid = new Map<string, typeof events>();
      for (const event of events) {
        if (!event.externalId) continue;
        const current = eventsByMid.get(event.externalId) ?? [];
        current.push(event);
        eventsByMid.set(event.externalId, current);
      }

      const mids = [...eventsByMid.keys()];
      let repaired = 0;
      const resolvedMids = new Set<string>();

      for (let offset = 0; offset < mids.length; offset += MAX_BATCH_SIZE) {
        const batch = mids.slice(offset, offset + MAX_BATCH_SIZE);
        const messages = await this.fetchMessages(batch, token);

        for (const message of messages) {
          const mid = message.body?.mid?.trim();
          if (!mid || !batch.includes(mid)) continue;
          if (message.recipient?.chat_id !== sourceChannelId) continue;

          const exactUrl = this.canonicalMaxPostUrl(message.url);
          if (!exactUrl) continue;

          const matchingEvents = eventsByMid.get(mid) ?? [];
          for (const event of matchingEvents) {
            if (event.sourcePostUrl === exactUrl) continue;
            await this.prisma.event.update({
              where: { id: event.id },
              data: { sourcePostUrl: exactUrl },
            });
            repaired++;
          }
          resolvedMids.add(mid);
        }
      }

      const unresolved = mids.length - resolvedMids.size;
      if (repaired > 0 || unresolved > 0) {
        this.logger.log(
          `MAX source-link repair: scanned=${events.length}, repaired=${repaired}, unresolved=${unresolved}`,
        );
      }

      return {
        scanned: events.length,
        repaired,
        unresolved,
        skipped: false,
      };
    } finally {
      this.repairInProgress = false;
    }
  }

  private async fetchMessages(
    mids: string[],
    token: string,
  ): Promise<MaxApiMessage[]> {
    const params = new URLSearchParams({ message_ids: mids.join(',') });
    const timeout = Number(
      this.config.get<string>('MAX_IMPORT_TIMEOUT_MS') ?? '60000',
    );

    const response = await fetch(`${MAX_API_BASE}/messages?${params.toString()}`, {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(timeout),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(`MAX source-link authorization failed: HTTP ${response.status}`);
    }
    if (!response.ok) {
      throw new Error(
        `MAX source-link lookup failed: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as MaxMessagesResponse;
    return Array.isArray(data.messages) ? data.messages : [];
  }

  private canonicalMaxPostUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:') return null;
      if (url.hostname !== 'max.ru' && !url.hostname.endsWith('.max.ru')) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  private getSourceChannelId(): number | null {
    const raw = this.config.get<string>('MAX_SOURCE_CHANNEL_ID')?.trim();
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isSafeInteger(value) ? value : null;
  }
}
