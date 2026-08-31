import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAX_API_BASE = 'https://platform-api2.max.ru';
const DISCOVERY_KEY = 'editorial.max.discoveredChannels';

const TARGETS = [
  {
    key: 'MAX_CHANNEL_1',
    env: 'MAX_EDITORIAL_CHANNEL_1_ID',
    configKey: 'editorial.max.binding.MAX_CHANNEL_1',
    label: 'MAX — канал 1',
    publicUrl: 'https://max.ru/join/tumioTNhr5Kh90TaDp1Tzgn-uDKw8Eko7KFhXdKeu9c',
  },
  {
    key: 'MAX_CHANNEL_2',
    env: 'MAX_EDITORIAL_CHANNEL_2_ID',
    configKey: 'editorial.max.binding.MAX_CHANNEL_2',
    label: 'MAX — канал 2',
    publicUrl: 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0',
  },
  {
    key: 'MAX_CHANNEL_3',
    env: 'MAX_EDITORIAL_CHANNEL_3_ID',
    configKey: 'editorial.max.binding.MAX_CHANNEL_3',
    label: 'Макс - "АБ| Пратнер"',
    publicUrl: 'https://max.ru/join/iPKA4EFVMhPU9oJXqHDk7vRhD4Tl0BAswVkqfxW8iYA',
  },
] as const;

type DiscoveredMaxChannel = {
  chatId: string;
  title: string | null;
  link: string | null;
  type: string | null;
  status: string | null;
  isPublic: boolean | null;
  description: string | null;
  lastSeenAt: string;
  source: string;
};

type BindingValue = {
  chatId: string;
  title?: string | null;
  link?: string | null;
  boundAt: string;
  source: 'auto-link' | 'admin';
};

@Injectable()
export class EditorialMaxDiscoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EditorialMaxDiscoveryService.name);
  private readonly recentlyChecked = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    void this.restoreBindings().then(() => this.probeConfiguredSource()).catch((error) => {
      this.logger.warn(`MAX editorial bootstrap discovery failed: ${this.errorMessage(error)}`);
    });
  }

  async getState() {
    const [discovered, bindings] = await Promise.all([
      this.readDiscovered(),
      Promise.all(TARGETS.map((target) => this.readBinding(target.configKey))),
    ]);

    return {
      targets: TARGETS.map((target, index) => {
        const binding = bindings[index];
        const envChatId = process.env[target.env] || null;
        const restoredFromDatabase = Boolean(
          binding?.chatId && envChatId && binding.chatId === envChatId,
        );
        return {
          key: target.key,
          label: target.label,
          publicUrl: target.publicUrl,
          envName: target.env,
          chatId: envChatId || binding?.chatId || null,
          configured: Boolean(envChatId || binding?.chatId),
          source: restoredFromDatabase
            ? 'database'
            : envChatId
              ? 'environment'
              : binding
                ? 'database'
                : null,
          binding,
        };
      }),
      discovered,
      instructions:
        'Добавьте бота администратором в нужный MAX-канал. Событие bot_added содержит chat_id; кабинет сохранит канал автоматически. Если бот уже был добавлен раньше, удалите и добавьте его заново либо дождитесь события канала, содержащего chat_id.',
    };
  }

  async captureUpdate(raw: unknown): Promise<void> {
    const chatId = this.extractChatId(raw);
    if (!chatId) return;

    const updateType = this.extractUpdateType(raw);
    if (updateType === 'bot_removed') {
      await this.handleRemoved(chatId);
      return;
    }

    const now = Date.now();
    const previous = this.recentlyChecked.get(chatId);
    if (previous && now - previous < 6 * 60 * 60 * 1000) return;
    this.recentlyChecked.set(chatId, now);

    try {
      const channel = await this.fetchChat(chatId);
      if (!channel || channel.type !== 'channel') return;
      const discovered = await this.upsertDiscovered({ ...channel, source: updateType || 'webhook' });
      await this.autoBindByLink(discovered);
    } catch (error) {
      this.logger.warn(
        `MAX channel discovery failed for chat_id=${chatId}: ${this.errorMessage(error)}`,
      );
    }
  }

  async bind(targetKey: string, chatId: string) {
    const target = TARGETS.find((item) => item.key === targetKey);
    if (!target) throw new BadRequestException(`Неизвестный MAX-канал назначения: ${targetKey}`);

    const normalizedChatId = this.normalizeChatId(chatId);
    if (!normalizedChatId) throw new BadRequestException('Некорректный chat_id MAX');

    const chat = await this.fetchChat(normalizedChatId);
    if (!chat || chat.type !== 'channel') {
      throw new BadRequestException(`chat_id=${normalizedChatId} не является MAX-каналом`);
    }

    const discovered = await this.upsertDiscovered({ ...chat, source: 'admin-bind' });
    await this.saveBinding(target.configKey, {
      chatId: normalizedChatId,
      title: discovered.title,
      link: discovered.link,
      boundAt: new Date().toISOString(),
      source: 'admin',
    });
    process.env[target.env] = normalizedChatId;
    return this.getState();
  }

  async unbind(targetKey: string) {
    const target = TARGETS.find((item) => item.key === targetKey);
    if (!target) throw new BadRequestException(`Неизвестный MAX-канал назначения: ${targetKey}`);

    await this.prisma.siteConfig.deleteMany({ where: { key: target.configKey } });
    delete process.env[target.env];
    return this.getState();
  }

  async refresh(chatId: string) {
    const normalizedChatId = this.normalizeChatId(chatId);
    if (!normalizedChatId) throw new BadRequestException('Некорректный chat_id MAX');
    const chat = await this.fetchChat(normalizedChatId);
    if (!chat || chat.type !== 'channel') {
      throw new BadRequestException(`chat_id=${normalizedChatId} не является MAX-каналом`);
    }
    const discovered = await this.upsertDiscovered({ ...chat, source: 'admin-refresh' });
    await this.autoBindByLink(discovered);
    return this.getState();
  }

  private async restoreBindings() {
    for (const target of TARGETS) {
      if (process.env[target.env]) continue;
      const binding = await this.readBinding(target.configKey);
      if (binding?.chatId) process.env[target.env] = binding.chatId;
    }
  }

  private async probeConfiguredSource() {
    const sourceId = this.normalizeChatId(process.env.MAX_SOURCE_CHANNEL_ID || '');
    if (!sourceId) return;
    await this.refresh(sourceId).catch(() => undefined);
  }

  private async fetchChat(chatId: string): Promise<Omit<DiscoveredMaxChannel, 'lastSeenAt' | 'source'> | null> {
    const token = process.env.MAX_BOT_TOKEN;
    if (!token) throw new Error('MAX_BOT_TOKEN not configured');

    const response = await fetch(`${MAX_API_BASE}/chats/${encodeURIComponent(chatId)}`, {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`GET /chats/${chatId}: HTTP ${response.status} ${text}`.trim());
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`GET /chats/${chatId}: invalid JSON response`);
    }

    const returnedId = this.normalizeChatId(body.chat_id);
    if (!returnedId) return null;
    return {
      chatId: returnedId,
      title: typeof body.title === 'string' ? body.title : null,
      link: typeof body.link === 'string' ? body.link : null,
      type: typeof body.type === 'string' ? body.type : null,
      status: typeof body.status === 'string' ? body.status : null,
      isPublic: typeof body.is_public === 'boolean' ? body.is_public : null,
      description: typeof body.description === 'string' ? body.description : null,
    };
  }

  private async upsertDiscovered(
    value: Omit<DiscoveredMaxChannel, 'lastSeenAt'>,
  ): Promise<DiscoveredMaxChannel> {
    const current = await this.readDiscovered();
    const next: DiscoveredMaxChannel = {
      ...value,
      lastSeenAt: new Date().toISOString(),
    };
    const rows = [next, ...current.filter((item) => item.chatId !== value.chatId)].slice(0, 50);
    await this.prisma.siteConfig.upsert({
      where: { key: DISCOVERY_KEY },
      update: { value: rows as any },
      create: { key: DISCOVERY_KEY, value: rows as any },
    });
    return next;
  }

  private async autoBindByLink(channel: DiscoveredMaxChannel) {
    if (!channel.link) return;
    const normalizedLink = this.normalizeUrl(channel.link);
    const target = TARGETS.find((item) => this.normalizeUrl(item.publicUrl) === normalizedLink);
    if (!target) return;

    const existing = await this.readBinding(target.configKey);
    if (existing?.chatId === channel.chatId || process.env[target.env]) return;

    const binding: BindingValue = {
      chatId: channel.chatId,
      title: channel.title,
      link: channel.link,
      boundAt: new Date().toISOString(),
      source: 'auto-link',
    };
    await this.saveBinding(target.configKey, binding);
    process.env[target.env] = channel.chatId;
    this.logger.log(`Auto-bound ${target.key} to MAX chat_id=${channel.chatId}`);
  }

  private async handleRemoved(chatId: string) {
    const current = await this.readDiscovered();
    const row = current.find((item) => item.chatId === chatId);
    if (row) {
      await this.prisma.siteConfig.upsert({
        where: { key: DISCOVERY_KEY },
        update: {
          value: current.map((item) =>
            item.chatId === chatId
              ? { ...item, status: 'removed', lastSeenAt: new Date().toISOString(), source: 'bot_removed' }
              : item,
          ) as any,
        },
        create: { key: DISCOVERY_KEY, value: current as any },
      });
    }

    for (const target of TARGETS) {
      const binding = await this.readBinding(target.configKey);
      if (binding?.chatId !== chatId) continue;
      await this.prisma.siteConfig.deleteMany({ where: { key: target.configKey } });
      if (process.env[target.env] === chatId) delete process.env[target.env];
      this.logger.warn(`Removed MAX binding ${target.key}: bot_removed for chat_id=${chatId}`);
    }
  }

  private async readDiscovered(): Promise<DiscoveredMaxChannel[]> {
    const config = await this.prisma.siteConfig.findUnique({ where: { key: DISCOVERY_KEY } });
    if (!Array.isArray(config?.value)) return [];
    return (config.value as unknown[])
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        chatId: String(item.chatId || ''),
        title: typeof item.title === 'string' ? item.title : null,
        link: typeof item.link === 'string' ? item.link : null,
        type: typeof item.type === 'string' ? item.type : null,
        status: typeof item.status === 'string' ? item.status : null,
        isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : null,
        description: typeof item.description === 'string' ? item.description : null,
        lastSeenAt: typeof item.lastSeenAt === 'string' ? item.lastSeenAt : '',
        source: typeof item.source === 'string' ? item.source : 'stored',
      }))
      .filter((item) => Boolean(item.chatId));
  }

  private async readBinding(configKey: string): Promise<BindingValue | null> {
    const config = await this.prisma.siteConfig.findUnique({ where: { key: configKey } });
    if (!config?.value || typeof config.value !== 'object' || Array.isArray(config.value)) return null;
    const value = config.value as Record<string, unknown>;
    const chatId = this.normalizeChatId(value.chatId);
    if (!chatId) return null;
    return {
      chatId,
      title: typeof value.title === 'string' ? value.title : null,
      link: typeof value.link === 'string' ? value.link : null,
      boundAt: typeof value.boundAt === 'string' ? value.boundAt : '',
      source: value.source === 'auto-link' ? 'auto-link' : 'admin',
    };
  }

  private async saveBinding(configKey: string, value: BindingValue) {
    await this.prisma.siteConfig.upsert({
      where: { key: configKey },
      update: { value: value as any },
      create: { key: configKey, value: value as any },
    });
  }

  private extractChatId(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const direct = this.normalizeChatId(row.chat_id);
    if (direct) return direct;

    const message = row.message;
    if (!message || typeof message !== 'object') return null;
    const recipient = (message as Record<string, unknown>).recipient;
    if (!recipient || typeof recipient !== 'object') return null;
    return this.normalizeChatId((recipient as Record<string, unknown>).chat_id);
  }

  private extractUpdateType(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = (raw as Record<string, unknown>).update_type;
    return typeof value === 'string' ? value : null;
  }

  private normalizeChatId(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!/^-?\d+$/.test(raw)) return null;
    return raw;
  }

  private normalizeUrl(value: string) {
    return value.trim().replace(/\/$/, '').toLowerCase();
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
