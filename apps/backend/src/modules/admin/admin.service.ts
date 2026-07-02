import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

// Keys exposed to admin settings UI
export const SETTINGS_KEYS = [
  'bot.phoneRequired',
  'cookie.noticeEnabled',
  'cookie.noticeText',
  'cookie.buttonText',
  'broadcast.cooldownHours',
  'broadcast.telegramRatePerSecond',
  'broadcast.maxRatePerSecond',
  'broadcast.maxRecipients',
  'broadcast.allowSimultaneous',
  'maintenance.enabled',
  'maintenance.title',
  'maintenance.description',
  'maintenance.imageUrl',
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export interface SiteConfigRow {
  key: string;
  value: unknown;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return '';
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SiteConfigRow[]> {
    return this.prisma.siteConfig.findMany({
      where: { key: { in: SETTINGS_KEYS as unknown as string[] } },
      orderBy: { key: 'asc' },
    });
  }

  async getSiteStatus(): Promise<{ maintenanceEnabled: boolean; title: string; description: string; imageUrl: string }> {
    const rows = await this.prisma.siteConfig.findMany({
      where: { key: { in: ['maintenance.enabled', 'maintenance.title', 'maintenance.description', 'maintenance.imageUrl'] } },
    });
    const map = Object.fromEntries(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
    return {
      maintenanceEnabled: map['maintenance.enabled'] === true,
      title: typeof map['maintenance.title'] === 'string' ? (map['maintenance.title'] as string) : 'Технические работы',
      description: typeof map['maintenance.description'] === 'string' ? (map['maintenance.description'] as string) : '',
      imageUrl: typeof map['maintenance.imageUrl'] === 'string' ? (map['maintenance.imageUrl'] as string) : '',
    };
  }

  async updateSetting(key: string, value: unknown): Promise<SiteConfigRow> {
    const existing = await this.prisma.siteConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`SiteConfig key not found: ${key}`);
    return this.prisma.siteConfig.update({ where: { key }, data: { value: toInputJsonValue(value) } });
  }

  async getDashboard() {
    const now = new Date();

    const [
      totalEvents,
      publishedEvents,
      draftEvents,
      needsAttentionEvents,
      activeBroadcasts,
      totalBotUsers,
      pendingReminders,
      legalDrafts,
      needsAttentionList,
      upcomingEvents,
      recentBroadcasts,
    ] = await Promise.all([
      this.prisma.event.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.event.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.event.count({ where: { status: 'DRAFT' } }),
      this.prisma.event.count({ where: { status: 'NEEDS_ATTENTION' } }),
      this.prisma.broadcast.count({ where: { status: { in: ['SCHEDULED', 'QUEUED', 'SENDING'] } } }),
      this.prisma.botUser.count(),
      this.prisma.reminder.count({ where: { status: 'PENDING' } }),
      this.prisma.legalDoc.count({ where: { isDraft: true } }),
      this.prisma.event.findMany({
        where: { status: 'NEEDS_ATTENTION' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, title: true, updatedAt: true, cityName: true },
      }),
      this.prisma.event.findMany({
        where: { status: 'PUBLISHED', startDate: { gte: now } },
        orderBy: { startDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          startDate: true,
          autoStatus: true,
          cityName: true,
          city: { select: { name: true } },
        },
      }),
      this.prisma.broadcast.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true, scheduledAt: true },
      }),
    ]);

    return {
      stats: {
        totalEvents,
        publishedEvents,
        draftEvents,
        needsAttentionEvents,
        activeBroadcasts,
        totalBotUsers,
        pendingReminders,
        legalDrafts,
      },
      needsAttentionList,
      upcomingEvents,
      recentBroadcasts,
    };
  }
}
