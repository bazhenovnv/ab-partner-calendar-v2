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
}
