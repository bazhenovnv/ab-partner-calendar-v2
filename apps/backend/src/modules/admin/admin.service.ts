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
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export interface SiteConfigRow {
  key: string;
  value: unknown;
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

  async updateSetting(key: string, value: unknown): Promise<SiteConfigRow> {
    const existing = await this.prisma.siteConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`SiteConfig key not found: ${key}`);
    const jsonValue: Prisma.InputJsonValue =
      value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
    return this.prisma.siteConfig.update({ where: { key }, data: { value: jsonValue } });
  }
}
