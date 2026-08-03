import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface BotUserSnapshot {
  id: string;
  legalAcceptedAt: Date | null;
  broadcastConsentAcceptedAt: Date | null;
  phone: string | null;
  allowMarketingMessages: boolean;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function iso(value: Date | null): string {
  return value ? value.toISOString() : '';
}

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBotUser(data: {
    channel: 'TELEGRAM' | 'MAX';
    externalId: string;
    username?: string | null;
    firstName?: string | null;
  }): Promise<BotUserSnapshot> {
    return this.prisma.botUser.upsert({
      where: { channel_externalId: { channel: data.channel, externalId: data.externalId } },
      create: {
        channel: data.channel,
        externalId: data.externalId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
      },
      update: {
        username: data.username ?? undefined,
        firstName: data.firstName ?? undefined,
        lastActivityAt: new Date(),
      },
      select: {
        id: true,
        legalAcceptedAt: true,
        broadcastConsentAcceptedAt: true,
        phone: true,
        allowMarketingMessages: true,
      },
    }) as Promise<BotUserSnapshot>;
  }

  async acceptLegal(id: string, acceptBroadcastConsent: boolean): Promise<void> {
    const now = new Date();
    await this.prisma.botUser.update({
      where: { id },
      data: {
        legalAcceptedAt: now,
        lastActivityAt: now,
        ...(acceptBroadcastConsent ? { broadcastConsentAcceptedAt: now } : {}),
      },
    });
  }

  async savePhone(id: string, phone: string): Promise<void> {
    await this.prisma.botUser.update({
      where: { id },
      data: { phone, phoneVerifiedAt: new Date(), lastActivityAt: new Date() },
    });
  }

  async isPhoneRequired(): Promise<boolean> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'bot.phoneRequired' } });
    return cfg?.value === true;
  }

  async findAcceptedContacts(page = 1, limit = 50) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
    const where = { legalAcceptedAt: { not: null } } as const;
    const skip = (safePage - 1) * safeLimit;

    const [items, total, telegram, max, marketingAllowed, withPhone] = await Promise.all([
      this.prisma.botUser.findMany({
        where,
        select: {
          id: true,
          channel: true,
          externalId: true,
          username: true,
          firstName: true,
          phone: true,
          phoneVerifiedAt: true,
          allowMarketingMessages: true,
          allowServiceNotifications: true,
          legalAcceptedAt: true,
          broadcastConsentAcceptedAt: true,
          lastActivityAt: true,
          subscribedAt: true,
          createdAt: true,
        },
        orderBy: { legalAcceptedAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.botUser.count({ where }),
      this.prisma.botUser.count({ where: { ...where, channel: 'TELEGRAM' } }),
      this.prisma.botUser.count({ where: { ...where, channel: 'MAX' } }),
      this.prisma.botUser.count({
        where: {
          ...where,
          allowMarketingMessages: true,
          broadcastConsentAcceptedAt: { not: null },
        },
      }),
      this.prisma.botUser.count({ where: { ...where, phone: { not: null } } }),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      summary: { telegram, max, marketingAllowed, withPhone },
    };
  }

  async exportAcceptedContactsCsv(): Promise<string> {
    const contacts = await this.prisma.botUser.findMany({
      where: { legalAcceptedAt: { not: null } },
      select: {
        channel: true,
        externalId: true,
        username: true,
        firstName: true,
        phone: true,
        phoneVerifiedAt: true,
        allowMarketingMessages: true,
        allowServiceNotifications: true,
        legalAcceptedAt: true,
        broadcastConsentAcceptedAt: true,
        lastActivityAt: true,
        subscribedAt: true,
      },
      orderBy: { legalAcceptedAt: 'desc' },
    });

    const rows = [
      [
        'Канал',
        'ID пользователя',
        'Username',
        'Имя',
        'Телефон',
        'Телефон подтверждён',
        'Юридические документы приняты',
        'Согласие на рассылку',
        'Рассылки разрешены',
        'Сервисные уведомления разрешены',
        'Последняя активность',
        'Дата подписки',
      ],
      ...contacts.map((contact) => [
        contact.channel,
        contact.externalId,
        contact.username,
        contact.firstName,
        contact.phone,
        iso(contact.phoneVerifiedAt),
        iso(contact.legalAcceptedAt),
        iso(contact.broadcastConsentAcceptedAt),
        contact.allowMarketingMessages ? 'Да' : 'Нет',
        contact.allowServiceNotifications ? 'Да' : 'Нет',
        iso(contact.lastActivityAt),
        iso(contact.subscribedAt),
      ]),
    ];

    return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  }
}
