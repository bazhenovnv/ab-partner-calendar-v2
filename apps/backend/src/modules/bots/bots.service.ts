import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface BotUserSnapshot {
  id: string;
  legalAcceptedAt: Date | null;
  broadcastConsentAcceptedAt: Date | null;
  phone: string | null;
  allowMarketingMessages: boolean;
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
        ...(acceptBroadcastConsent ? { broadcastConsentAcceptedAt: now } : {}),
      },
    });
  }

  async savePhone(id: string, phone: string): Promise<void> {
    await this.prisma.botUser.update({
      where: { id },
      data: { phone, phoneVerifiedAt: new Date() },
    });
  }

  async isPhoneRequired(): Promise<boolean> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'bot.phoneRequired' } });
    return cfg?.value === true;
  }
}
