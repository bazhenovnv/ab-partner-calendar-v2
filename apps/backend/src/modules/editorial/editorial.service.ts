import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { telegramPostJson } from '../../common/telegram/telegram-api';

type Platform = 'TELEGRAM' | 'MAX';
type ContentType = 'NEWS' | 'EVENT';

type EditorialMedia = {
  url: string;
  template: string;
  width?: number;
  height?: number;
};

type ChannelDefinition = {
  key: string;
  platform: Platform;
  name: string;
  publicUrl: string;
  telegramTarget?: string;
  maxChatEnv?: string;
};

type PublishResult = {
  channelKey: string;
  channelName: string;
  platform: Platform;
  success: boolean;
  messageId?: string;
  url?: string;
  errorCode?: string;
  errorMessage?: string;
};

const CHANNELS: ChannelDefinition[] = [
  {
    key: 'TG_A_BPORTAL',
    platform: 'TELEGRAM',
    name: 'Telegram — АБ Портал',
    publicUrl: 'https://t.me/a_bportal',
    telegramTarget: '@a_bportal',
  },
  {
    key: 'TG_AB_AFISHA_BUH',
    platform: 'TELEGRAM',
    name: 'Telegram — АБ Афиша бухгалтера',
    publicUrl: 'https://t.me/ab_afisha_buh',
    telegramTarget: '@ab_afisha_buh',
  },
  {
    key: 'MAX_CHANNEL_1',
    platform: 'MAX',
    name: 'MAX — канал 1',
    publicUrl: 'https://max.ru/join/tumioTNhr5Kh90TaDp1Tzgn-uDKw8Eko7KFhXdKeu9c',
    maxChatEnv: 'MAX_EDITORIAL_CHANNEL_1_ID',
  },
  {
    key: 'MAX_CHANNEL_2',
    platform: 'MAX',
    name: 'MAX — канал 2',
    publicUrl: 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0',
    maxChatEnv: 'MAX_EDITORIAL_CHANNEL_2_ID',
  },
  {
    key: 'MAX_CHANNEL_3',
    platform: 'MAX',
    name: 'Макс - "АБ| Пратнер"',
    publicUrl: 'https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA',
    maxChatEnv: 'MAX_EDITORIAL_CHANNEL_3_ID',
  },
];

const IMAGE_TEMPLATES: Record<string, { width?: number; height?: number; label: string }> = {
  square: { width: 1080, height: 1080, label: 'Квадрат 1:1' },
  portrait: { width: 1080, height: 1350, label: 'Вертикальный 4:5' },
  landscape: { width: 1280, height: 720, label: 'Горизонтальный 16:9' },
  story: { width: 1080, height: 1920, label: 'История 9:16' },
  original: { label: 'Оригинал' },
};

@Injectable()
export class EditorialService {
  private readonly logger = new Logger(EditorialService.name);

  constructor(private readonly prisma: PrismaService) {}

  getChannels() {
    return CHANNELS.map((channel) => ({
      ...channel,
      configured: this.isConfigured(channel),
      targetId:
        channel.platform === 'TELEGRAM'
          ? channel.telegramTarget
          : channel.maxChatEnv
            ? process.env[channel.maxChatEnv] || null
            : null,
      capabilities: {
        richText: true,
        images: true,
        nativeViews: channel.platform === 'MAX',
      },
      configurationHint:
        channel.platform === 'MAX' && channel.maxChatEnv && !process.env[channel.maxChatEnv]
          ? `Добавьте ${channel.maxChatEnv} с числовым chat_id канала`
          : null,
    }));
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.editorialPost.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { publications: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.editorialPost.count(),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const post = await this.prisma.editorialPost.findUnique({
      where: { id },
      include: {
        publications: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!post) throw new NotFoundException(`Editorial post ${id} not found`);
    return post;
  }

  async create(dto: Record<string, unknown>) {
    const normalized = this.normalizePost(dto);
    return this.prisma.editorialPost.create({ data: normalized });
  }

  async update(id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.editorialPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Editorial post ${id} not found`);
    if (!['DRAFT', 'FAILED', 'PARTIAL_FAILED'].includes(existing.status)) {
      throw new BadRequestException('Опубликованную запись нельзя менять. Создайте новую публикацию.');
    }
    const normalized = this.normalizePost(dto);
    return this.prisma.editorialPost.update({ where: { id }, data: normalized });
  }

  async publish(id: string, requestedChannelKeys?: string[]) {
    const post = await this.prisma.editorialPost.findUnique({
      where: { id },
      include: { publications: true },
    });
    if (!post) throw new NotFoundException(`Editorial post ${id} not found`);

    const selectedKeys = this.normalizeChannelKeys(requestedChannelKeys?.length ? requestedChannelKeys : post.channelKeys);
    if (selectedKeys.length === 0) {
      throw new BadRequestException('Выберите хотя бы один канал публикации');
    }

    const plainLength = this.stripHtml(this.composeHtml(post.title, post.contentHtml)).length;
    if (plainLength > 3900) {
      throw new BadRequestException(
        `Текст публикации ${plainLength} символов. Для одновременной публикации в Telegram и MAX оставьте не более 3900 символов.`,
      );
    }

    await this.prisma.editorialPost.update({
      where: { id },
      data: { status: 'PUBLISHING', channelKeys: selectedKeys },
    });

    const results: PublishResult[] = [];
    for (const channelKey of selectedKeys) {
      const channel = this.getChannel(channelKey);
      const existingPublication = await this.prisma.editorialPublication.findUnique({
        where: { postId_channelKey: { postId: id, channelKey } },
      });

      if (existingPublication?.status === 'PUBLISHED') {
        results.push({
          channelKey,
          channelName: channel.name,
          platform: channel.platform,
          success: true,
          messageId: existingPublication.providerMessageId || undefined,
          url: existingPublication.providerUrl || undefined,
        });
        continue;
      }

      await this.prisma.editorialPublication.upsert({
        where: { postId_channelKey: { postId: id, channelKey } },
        create: {
          postId: id,
          channelKey,
          channelName: channel.name,
          platform: channel.platform,
          status: 'SENDING',
        },
        update: {
          status: 'SENDING',
          errorCode: null,
          errorMessage: null,
        },
      });

      const result = await this.publishToChannel(post, channel);
      results.push(result);

      if (result.success) {
        await this.prisma.editorialPublication.update({
          where: { postId_channelKey: { postId: id, channelKey } },
          data: {
            status: 'PUBLISHED',
            providerMessageId: result.messageId || null,
            providerUrl: result.url || null,
            errorCode: null,
            errorMessage: null,
            publishedAt: new Date(),
          },
        });
      } else {
        await this.prisma.editorialPublication.update({
          where: { postId_channelKey: { postId: id, channelKey } },
          data: {
            status: 'FAILED',
            errorCode: result.errorCode || 'UNKNOWN',
            errorMessage: result.errorMessage || 'Неизвестная ошибка',
          },
        });
        await this.prisma.errorLog.create({
          data: {
            context: `editorial.publish.${channel.key}`,
            message: result.errorMessage || 'Неизвестная ошибка публикации',
            payload: {
              postId: id,
              channelKey,
              platform: channel.platform,
              code: result.errorCode || 'UNKNOWN',
            },
          },
        });
      }

      if (channel.platform === 'MAX') {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;
    const status =
      successCount === results.length
        ? 'PUBLISHED'
        : successCount > 0
          ? 'PARTIAL_FAILED'
          : 'FAILED';

    await this.prisma.editorialPost.update({
      where: { id },
      data: {
        status,
        publishedAt: successCount > 0 ? new Date() : null,
      },
    });

    return {
      ok: failedCount === 0,
      status,
      successCount,
      failedCount,
      results,
    };
  }

  async retryFailed(id: string, requestedChannelKeys?: string[]) {
    const post = await this.findOne(id);
    const failed = post.publications
      .filter((publication) => publication.status === 'FAILED')
      .map((publication) => publication.channelKey);
    const requested = requestedChannelKeys?.length
      ? failed.filter((key) => requestedChannelKeys.includes(key))
      : failed;
    if (requested.length === 0) {
      throw new BadRequestException('Для этой публикации нет выбранных каналов с ошибкой');
    }
    return this.publish(id, requested);
  }

  async uploadImage(file: Express.Multer.File | undefined, templateKey: string) {
    if (!file) throw new BadRequestException('Файл изображения не получен');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Разрешены только изображения');
    }

    const template = IMAGE_TEMPLATES[templateKey];
    if (!template) {
      throw new BadRequestException(`Неизвестный шаблон изображения: ${templateKey}`);
    }

    const outputDir = join(process.cwd(), 'uploads', 'editorial');
    await mkdir(outputDir, { recursive: true });
    const filename = `${Date.now()}-${uuidv4()}.jpg`;
    const outputPath = join(outputDir, filename);

    let pipeline = sharp(file.buffer).rotate();
    if (template.width && template.height) {
      pipeline = pipeline.resize(template.width, template.height, {
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: false,
      });
    }
    const info = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toFile(outputPath);
    const relativeUrl = `/uploads/editorial/${filename}`;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ab-event.pro').replace(/\/$/, '');

    return {
      url: `${siteUrl}${relativeUrl}`,
      relativeUrl,
      template: templateKey,
      templateLabel: template.label,
      width: info.width,
      height: info.height,
      size: info.size,
    };
  }

  async getDashboard(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [posts, publications, failed, snapshots, recentErrors] = await Promise.all([
      this.prisma.editorialPost.groupBy({
        by: ['contentType'],
        _count: { _all: true },
      }),
      this.prisma.editorialPublication.groupBy({
        by: ['channelKey', 'channelName', 'platform', 'status'],
        _count: { _all: true },
      }),
      this.prisma.editorialPublication.count({ where: { status: 'FAILED' } }),
      this.prisma.editorialStatsSnapshot.findMany({
        where: { capturedAt: { gte: since } },
        include: { publication: { select: { channelKey: true } } },
        orderBy: { capturedAt: 'asc' },
      }),
      this.prisma.editorialPublication.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          postId: true,
          channelKey: true,
          channelName: true,
          errorCode: true,
          errorMessage: true,
          updatedAt: true,
        },
      }),
    ]);

    const contentCounts = { NEWS: 0, EVENT: 0 };
    for (const row of posts) {
      if (row.contentType === 'NEWS' || row.contentType === 'EVENT') {
        contentCounts[row.contentType] = row._count._all;
      }
    }

    const byChannel = CHANNELS.map((channel) => {
      const matching = publications.filter((row) => row.channelKey === channel.key);
      return {
        key: channel.key,
        name: channel.name,
        platform: channel.platform,
        published: matching
          .filter((row) => row.status === 'PUBLISHED')
          .reduce((sum, row) => sum + row._count._all, 0),
        failed: matching
          .filter((row) => row.status === 'FAILED')
          .reduce((sum, row) => sum + row._count._all, 0),
        nativeViewsAvailable: channel.platform === 'MAX',
      };
    });

    const chartMap = new Map<string, Map<string, Map<string, number>>>();
    for (const snapshot of snapshots) {
      const day = snapshot.capturedAt.toISOString().slice(0, 10);
      if (!chartMap.has(day)) chartMap.set(day, new Map());
      const dayMap = chartMap.get(day)!;
      if (!dayMap.has(snapshot.publication.channelKey)) {
        dayMap.set(snapshot.publication.channelKey, new Map());
      }
      const publicationMap = dayMap.get(snapshot.publication.channelKey)!;
      const previous = publicationMap.get(snapshot.publicationId) || 0;
      publicationMap.set(snapshot.publicationId, Math.max(previous, snapshot.views));
    }

    const chart = Array.from(chartMap.entries()).map(([date, channelMap]) => ({
      date,
      channels: Object.fromEntries(
        Array.from(channelMap.entries()).map(([channelKey, publicationMap]) => [
          channelKey,
          Array.from(publicationMap.values()).reduce((sum, views) => sum + views, 0),
        ]),
      ),
    }));

    return {
      periodDays: days,
      counters: {
        news: contentCounts.NEWS,
        events: contentCounts.EVENT,
        publications: publications
          .filter((row) => row.status === 'PUBLISHED')
          .reduce((sum, row) => sum + row._count._all, 0),
        failed,
      },
      byChannel,
      chart,
      recentErrors,
      channels: this.getChannels(),
      statsNotice:
        'MAX возвращает native views через API. Telegram Bot API не отдаёт счётчик просмотров постов; для Telegram потребуется отдельная MTProto-сессия пользовательского аккаунта, если нужен именно нативный счётчик просмотров.',
    };
  }

  @Cron('0 */15 * * * *')
  async syncStats() {
    const maxToken = process.env.MAX_BOT_TOKEN;
    if (!maxToken) return { updated: 0, skipped: 0, errors: ['MAX_BOT_TOKEN not configured'] };

    const publications = await this.prisma.editorialPublication.findMany({
      where: {
        platform: 'MAX',
        status: 'PUBLISHED',
        providerMessageId: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 500,
    });

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const publication of publications) {
      try {
        const response = await fetch(
          `https://platform-api2.max.ru/messages/${encodeURIComponent(publication.providerMessageId!)}`,
          { headers: { Authorization: maxToken } },
        );
        if (!response.ok) {
          errors.push(`${publication.channelKey}: HTTP ${response.status}`);
          continue;
        }
        const body = (await response.json()) as {
          message?: { stat?: { views?: number }; url?: string };
          stat?: { views?: number };
          url?: string;
        };
        const message = body.message || body;
        const views = Number(message.stat?.views);
        if (!Number.isFinite(views)) {
          skipped += 1;
          continue;
        }

        await this.prisma.$transaction([
          this.prisma.editorialPublication.update({
            where: { id: publication.id },
            data: {
              views,
              providerUrl: message.url || publication.providerUrl,
              lastStatsAt: new Date(),
            },
          }),
          this.prisma.editorialStatsSnapshot.create({
            data: { publicationId: publication.id, views },
          }),
        ]);
        updated += 1;
      } catch (error) {
        errors.push(`${publication.channelKey}: ${this.errorMessage(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    if (errors.length) this.logger.warn(`Editorial stats sync errors: ${errors.join('; ')}`);
    return { updated, skipped, errors };
  }

  private async publishToChannel(
    post: {
      id: string;
      title: string;
      contentHtml: string;
      contentText: string;
      media: unknown;
    },
    channel: ChannelDefinition,
  ): Promise<PublishResult> {
    if (!this.isConfigured(channel)) {
      return {
        channelKey: channel.key,
        channelName: channel.name,
        platform: channel.platform,
        success: false,
        errorCode: 'CONFIG_MISSING',
        errorMessage:
          channel.platform === 'MAX' && channel.maxChatEnv
            ? `Не настроен ${channel.maxChatEnv}. Нужен числовой chat_id канала MAX.`
            : `Не настроен токен для ${channel.platform}`,
      };
    }

    try {
      if (channel.platform === 'TELEGRAM') return await this.publishTelegram(post, channel);
      return await this.publishMax(post, channel);
    } catch (error) {
      return {
        channelKey: channel.key,
        channelName: channel.name,
        platform: channel.platform,
        success: false,
        errorCode: `${channel.platform}_NETWORK_ERROR`,
        errorMessage: this.errorMessage(error),
      };
    }
  }

  private async publishTelegram(
    post: { title: string; contentHtml: string; media: unknown },
    channel: ChannelDefinition,
  ): Promise<PublishResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const target = channel.telegramTarget!;
    const html = this.composeHtml(post.title, post.contentHtml);
    const media = this.normalizeMedia(post.media);

    let mainMessageId: number | undefined;
    let error: { status: number; description: string } | null = null;

    if (media.length === 1 && this.stripHtml(html).length <= 950) {
      const response = await telegramPostJson<{
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
      }>(token, 'sendPhoto', {
        chat_id: target,
        photo: media[0].url,
        caption: html,
        parse_mode: 'HTML',
      });
      if (!response.ok || response.json?.ok === false) {
        error = {
          status: response.status,
          description: response.json?.description || response.body || `HTTP ${response.status}`,
        };
      } else {
        mainMessageId = response.json?.result?.message_id;
      }
    } else {
      if (media.length > 0) {
        const mediaPayload = media.slice(0, 10).map((item, index) => ({
          type: 'photo',
          media: item.url,
          ...(index === 0 ? { caption: `<b>${this.escapeHtml(post.title)}</b>`, parse_mode: 'HTML' } : {}),
        }));
        const mediaResponse = await telegramPostJson<{
          ok?: boolean;
          description?: string;
          result?: Array<{ message_id?: number }>;
        }>(token, 'sendMediaGroup', { chat_id: target, media: mediaPayload });
        if (!mediaResponse.ok || mediaResponse.json?.ok === false) {
          error = {
            status: mediaResponse.status,
            description: mediaResponse.json?.description || mediaResponse.body || `HTTP ${mediaResponse.status}`,
          };
        }
      }

      if (!error) {
        const textResponse = await telegramPostJson<{
          ok?: boolean;
          description?: string;
          result?: { message_id?: number };
        }>(token, 'sendMessage', {
          chat_id: target,
          text: html,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        });
        if (!textResponse.ok || textResponse.json?.ok === false) {
          error = {
            status: textResponse.status,
            description: textResponse.json?.description || textResponse.body || `HTTP ${textResponse.status}`,
          };
        } else {
          mainMessageId = textResponse.json?.result?.message_id;
        }
      }
    }

    if (error) {
      return {
        channelKey: channel.key,
        channelName: channel.name,
        platform: channel.platform,
        success: false,
        errorCode: `TG_HTTP_${error.status || 'API'}`,
        errorMessage: error.description,
      };
    }

    const providerUrl = mainMessageId
      ? `${channel.publicUrl}/${mainMessageId}`
      : channel.publicUrl;
    return {
      channelKey: channel.key,
      channelName: channel.name,
      platform: channel.platform,
      success: true,
      messageId: mainMessageId ? String(mainMessageId) : undefined,
      url: providerUrl,
    };
  }

  private async publishMax(
    post: { title: string; contentHtml: string; media: unknown },
    channel: ChannelDefinition,
  ): Promise<PublishResult> {
    const token = process.env.MAX_BOT_TOKEN!;
    const chatId = process.env[channel.maxChatEnv!]!;
    const html = this.composeHtml(post.title, post.contentHtml);
    const media = this.normalizeMedia(post.media);
    const attachments = media.slice(0, 10).map((item) => ({
      type: 'image',
      payload: { url: item.url },
    }));

    const response = await fetch(
      `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: html,
          format: 'html',
          ...(attachments.length ? { attachments } : {}),
          notify: true,
        }),
      },
    );

    const bodyText = await response.text();
    let body: {
      message?: {
        body?: { mid?: string };
        mid?: string;
        url?: string;
        stat?: { views?: number };
      };
      error?: string;
      message_text?: string;
    } = {};
    try {
      body = JSON.parse(bodyText) as typeof body;
    } catch {
      body = {};
    }

    if (!response.ok || !body.message) {
      return {
        channelKey: channel.key,
        channelName: channel.name,
        platform: channel.platform,
        success: false,
        errorCode: `MAX_HTTP_${response.status}`,
        errorMessage: body.error || body.message_text || bodyText || `MAX API HTTP ${response.status}`,
      };
    }

    const messageId = body.message.body?.mid || body.message.mid;
    return {
      channelKey: channel.key,
      channelName: channel.name,
      platform: channel.platform,
      success: true,
      messageId,
      url: body.message.url || channel.publicUrl,
    };
  }

  private normalizePost(dto: Record<string, unknown>) {
    const title = String(dto.title || '').trim();
    const contentHtml = String(dto.contentHtml || '').trim();
    const contentText = String(dto.contentText || this.stripHtml(contentHtml)).trim();
    if (!title) throw new BadRequestException('Укажите название публикации');
    if (!contentHtml && !contentText) throw new BadRequestException('Введите текст публикации');

    const contentType = String(dto.contentType || 'NEWS').toUpperCase() as ContentType;
    if (!['NEWS', 'EVENT'].includes(contentType)) {
      throw new BadRequestException('contentType должен быть NEWS или EVENT');
    }

    return {
      title: title.slice(0, 240),
      contentType,
      contentHtml: this.sanitizeRichHtml(contentHtml || this.escapeHtml(contentText)),
      contentText: contentText.slice(0, 5000),
      media: this.normalizeMedia(dto.media),
      channelKeys: this.normalizeChannelKeys(dto.channelKeys),
      scheduledAt: dto.scheduledAt ? new Date(String(dto.scheduledAt)) : null,
      status: 'DRAFT',
    };
  }

  private normalizeChannelKeys(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const known = new Set(CHANNELS.map((channel) => channel.key));
    return Array.from(new Set(value.map(String).filter((key) => known.has(key))));
  }

  private normalizeMedia(value: unknown): EditorialMedia[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const url = String(row.url || '').trim();
        if (!/^https?:\/\//i.test(url)) return null;
        return {
          url,
          template: String(row.template || 'original'),
          width: Number(row.width) || undefined,
          height: Number(row.height) || undefined,
        } as EditorialMedia;
      })
      .filter((item): item is EditorialMedia => Boolean(item))
      .slice(0, 10);
  }

  private getChannel(key: string): ChannelDefinition {
    const channel = CHANNELS.find((item) => item.key === key);
    if (!channel) throw new BadRequestException(`Неизвестный канал: ${key}`);
    return channel;
  }

  private isConfigured(channel: ChannelDefinition) {
    if (channel.platform === 'TELEGRAM') return Boolean(process.env.TELEGRAM_BOT_TOKEN);
    return Boolean(process.env.MAX_BOT_TOKEN && channel.maxChatEnv && process.env[channel.maxChatEnv]);
  }

  private composeHtml(title: string, contentHtml: string) {
    return `<b>${this.escapeHtml(title)}</b>\n\n${this.sanitizeRichHtml(contentHtml)}`.trim();
  }

  private sanitizeRichHtml(input: string) {
    const allowed = new Set([
      'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del',
      'code', 'pre', 'blockquote', 'a',
    ]);
    return input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2|h3|li)>/gi, '\n')
      .replace(/<(p|div|h1|h2|h3|ul|ol|li)(\s[^>]*)?>/gi, '')
      .replace(/<[^>]+>/g, (tag) => {
        const match = tag.match(/^<\s*(\/)?\s*([a-z0-9]+)([^>]*)>/i);
        if (!match) return '';
        const closing = Boolean(match[1]);
        const name = match[2].toLowerCase();
        if (!allowed.has(name)) return '';
        if (closing) return `</${name}>`;
        if (name !== 'a') return `<${name}>`;
        const href = match[3].match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || '';
        if (!/^https?:\/\//i.test(href)) return '';
        return `<a href="${this.escapeHtml(href)}">`;
      })
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private stripHtml(value: string) {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
