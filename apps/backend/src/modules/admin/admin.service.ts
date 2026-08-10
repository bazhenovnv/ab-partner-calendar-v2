import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return value as Prisma.InputJsonValue;
}

function pageArgs(page = 1, limit = 50) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0
    ? Math.min(Math.floor(limit), 200)
    : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
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

  async getSiteStatus(): Promise<{
    maintenanceEnabled: boolean;
    title: string;
    description: string;
    imageUrl: string;
  }> {
    const rows = await this.prisma.siteConfig.findMany({
      where: {
        key: {
          in: [
            'maintenance.enabled',
            'maintenance.title',
            'maintenance.description',
            'maintenance.imageUrl',
          ],
        },
      },
    });
    const map = Object.fromEntries(
      rows.map((row: { key: string; value: unknown }) => [row.key, row.value]),
    );
    return {
      maintenanceEnabled: map['maintenance.enabled'] === true,
      title:
        typeof map['maintenance.title'] === 'string'
          ? (map['maintenance.title'] as string)
          : 'Технические работы',
      description:
        typeof map['maintenance.description'] === 'string'
          ? (map['maintenance.description'] as string)
          : '',
      imageUrl:
        typeof map['maintenance.imageUrl'] === 'string'
          ? (map['maintenance.imageUrl'] as string)
          : '',
    };
  }

  async updateSetting(key: string, value: unknown): Promise<SiteConfigRow> {
    const existing = await this.prisma.siteConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`SiteConfig key not found: ${key}`);

    await this.prisma.siteConfigVersion.create({
      data: { key, value: existing.value as Prisma.InputJsonValue },
    });

    return this.prisma.siteConfig.update({
      where: { key },
      data: { value: toInputJsonValue(value) },
    });
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
      this.prisma.broadcast.count({
        where: { status: { in: ['SCHEDULED', 'QUEUED', 'SENDING'] } },
      }),
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
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          scheduledAt: true,
        },
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

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createUser(input: {
    email: string;
    name: string;
    role: UserRole;
    password: string;
  }) {
    const email = input.email.trim().toLocaleLowerCase('ru');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Пользователь с таким email уже существует');

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.prisma.actionLog.create({
      data: { action: 'admin.user.create', entity: 'User', entityId: user.id, after: user },
    });
    return user;
  }

  async updateUser(
    id: string,
    input: { name?: string; role?: UserRole; isActive?: boolean },
    actorId: string,
  ) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Пользователь не найден');
    if (id === actorId && input.isActive === false) {
      throw new ConflictException('Нельзя отключить собственную учётную запись');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.actionLog.create({
      data: {
        userId: actorId,
        action: 'admin.user.update',
        entity: 'User',
        entityId: id,
        before: {
          email: current.email,
          name: current.name,
          role: current.role,
          isActive: current.isActive,
        },
        after: updated,
      },
    });
    return updated;
  }

  async resetUserPassword(id: string, password: string, actorId: string) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Пользователь не найден');

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    await this.prisma.actionLog.create({
      data: {
        userId: actorId,
        action: 'admin.user.reset-password',
        entity: 'User',
        entityId: id,
      },
    });
    return { success: true };
  }

  async getMainEventsAdmin() {
    return this.prisma.event.findMany({
      where: { mainEvent: true, status: { not: 'DELETED' } },
      orderBy: [{ autoStatus: 'asc' }, { sortOrder: 'asc' }, { startDate: 'asc' }],
      include: {
        images: { select: { thumbnailUrl: true, mainEventUrl: true } },
        city: { select: { name: true, region: true } },
      },
    });
  }

  async getArchive(page = 1, limit = 50) {
    const args = pageArgs(page, limit);
    const where: Prisma.EventWhereInput = { status: { in: ['ARCHIVE', 'DELETED'] } };
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: args.skip,
        take: args.limit,
        include: { city: { select: { name: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);
    return { events, total, page: args.page, limit: args.limit };
  }

  async getBotsAndReminders() {
    const [byChannel, pending, failed, sentToday, recentReminders] = await Promise.all([
      this.prisma.botUser.groupBy({ by: ['channel'], _count: { _all: true } }),
      this.prisma.reminder.count({ where: { status: 'PENDING' } }),
      this.prisma.reminder.count({ where: { status: 'FAILED' } }),
      this.prisma.reminder.count({
        where: {
          status: 'SENT',
          sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.reminder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          botUser: {
            select: { channel: true, username: true, firstName: true, externalId: true },
          },
          event: { select: { id: true, title: true, startDate: true } },
        },
      }),
    ]);
    return { byChannel, pending, failed, sentToday, recentReminders };
  }

  async getSiteBuilder() {
    const [footerProjects, quotes, maintenance] = await Promise.all([
      this.prisma.footerProject.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] }),
      this.prisma.quote.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.getSiteStatus(),
    ]);
    return { footerProjects, quotes, maintenance };
  }

  async getActionLogs(page = 1, limit = 100) {
    const args = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.actionLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: args.skip,
        take: args.limit,
        include: { user: { select: { email: true, name: true, role: true } } },
      }),
      this.prisma.actionLog.count(),
    ]);
    return { items, total, page: args.page, limit: args.limit };
  }

  async getErrorLogs(page = 1, limit = 100) {
    const args = pageArgs(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: args.skip,
        take: args.limit,
      }),
      this.prisma.errorLog.count(),
    ]);
    return { items, total, page: args.page, limit: args.limit };
  }
}
