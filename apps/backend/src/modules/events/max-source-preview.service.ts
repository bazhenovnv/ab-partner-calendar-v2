import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

type RawMaxAttachment = {
  type?: string;
  payload?: {
    url?: string;
    filename?: string;
    width?: number;
    height?: number;
    mime_type?: string;
  };
};

type RawMaxMessage = {
  recipient?: { chat_id?: number };
  timestamp?: number;
  body?: {
    mid?: string;
    text?: string;
    attachments?: RawMaxAttachment[];
  } | null;
  url?: string | null;
};

type RawMaxChat = {
  chat_id?: number;
  type?: string;
  title?: string;
  is_public?: boolean;
  link?: string;
};

@Injectable()
export class MaxSourcePreviewService {
  private readonly apiBase = 'https://platform-api2.max.ru';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getEventSourcePreview(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        source: true,
        externalId: true,
        sourcePostUrl: true,
        sourceChannelUrl: true,
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (event.source !== 'MAX' || !event.externalId) {
      return {
        available: false,
        reason: 'NOT_MAX_SOURCE',
      } as const;
    }

    const token = this.config.get<string>('MAX_BOT_TOKEN')?.trim();
    const configuredChatId = this.getSourceChannelId();
    if (!token || configuredChatId === null) {
      return {
        available: false,
        reason: 'MAX_NOT_CONFIGURED',
        externalId: event.externalId,
      } as const;
    }

    const messageResponse = await fetch(
      `${this.apiBase}/messages/${encodeURIComponent(event.externalId)}`,
      {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(this.timeoutMs()),
      },
    );

    if (!messageResponse.ok) {
      return {
        available: false,
        reason: 'MAX_MESSAGE_LOOKUP_FAILED',
        externalId: event.externalId,
        httpStatus: messageResponse.status,
      } as const;
    }

    const message = (await messageResponse.json()) as RawMaxMessage;
    const returnedMid = message.body?.mid?.trim();
    const returnedChatId = message.recipient?.chat_id;

    if (returnedMid !== event.externalId || returnedChatId !== configuredChatId) {
      return {
        available: false,
        reason: 'MAX_MESSAGE_MISMATCH',
        externalId: event.externalId,
      } as const;
    }

    const chat = await this.fetchChat(configuredChatId, token).catch(() => null);
    const directPostUrl = this.canonicalMaxUrl(message.url);
    const channelUrl =
      this.safeHttpUrl(chat?.link) ??
      this.safeHttpUrl(event.sourceChannelUrl) ??
      this.safeHttpUrl(event.sourcePostUrl);

    const attachments = (message.body?.attachments ?? []).map((attachment) => ({
      type: typeof attachment.type === 'string' ? attachment.type : 'unknown',
      url: this.safeHttpUrl(attachment.payload?.url),
      filename:
        typeof attachment.payload?.filename === 'string'
          ? attachment.payload.filename
          : null,
      width:
        typeof attachment.payload?.width === 'number'
          ? attachment.payload.width
          : null,
      height:
        typeof attachment.payload?.height === 'number'
          ? attachment.payload.height
          : null,
      mimeType:
        typeof attachment.payload?.mime_type === 'string'
          ? attachment.payload.mime_type
          : null,
    }));

    return {
      available: true,
      source: 'MAX',
      externalId: event.externalId,
      directPostUrl,
      channel: {
        id: configuredChatId,
        title: typeof chat?.title === 'string' ? chat.title : null,
        type: typeof chat?.type === 'string' ? chat.type : 'channel',
        isPublic: chat?.is_public === true,
        url: channelUrl,
      },
      message: {
        text: typeof message.body?.text === 'string' ? message.body.text : '',
        timestamp: this.toIsoTimestamp(message.timestamp),
        attachments,
      },
    } as const;
  }

  private async fetchChat(chatId: number, token: string): Promise<RawMaxChat> {
    const response = await fetch(
      `${this.apiBase}/chats/${encodeURIComponent(String(chatId))}`,
      {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(this.timeoutMs()),
      },
    );

    if (!response.ok) {
      throw new Error(`MAX chat lookup failed: HTTP ${response.status}`);
    }

    return (await response.json()) as RawMaxChat;
  }

  private canonicalMaxUrl(value: unknown): string | null {
    const url = this.safeHttpUrl(value);
    if (!url) return null;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return null;
      if (parsed.hostname !== 'max.ru' && !parsed.hostname.endsWith('.max.ru')) {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private safeHttpUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
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

  private timeoutMs(): number {
    return Number(this.config.get<string>('MAX_IMPORT_TIMEOUT_MS') ?? '60000');
  }

  private toIsoTimestamp(value: unknown): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
