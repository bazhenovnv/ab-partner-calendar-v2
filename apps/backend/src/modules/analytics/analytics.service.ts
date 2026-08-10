import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminOverview() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      visits24h,
      visits7d,
      visits30d,
      eventViews30d,
      registrations30d,
      remindersCreated30d,
      botUsers,
      topEvents,
      recentVisits,
    ] = await Promise.all([
      this.prisma.siteVisit.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.siteVisit.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.siteVisit.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.eventView.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.eventView.count({
        where: { createdAt: { gte: monthAgo }, action: { in: ['register', 'ticket', 'participate'] } },
      }),
      this.prisma.reminder.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.botUser.count(),
      this.prisma.eventView.groupBy({
        by: ['eventId'],
        where: { createdAt: { gte: monthAgo } },
        _count: { _all: true },
        orderBy: { _count: { eventId: 'desc' } },
        take: 10,
      }),
      this.prisma.siteVisit.findMany({
        where: { createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { page: true, createdAt: true },
      }),
    ]);

    const eventIds = topEvents.map((item) => item.eventId);
    const events = eventIds.length
      ? await this.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, startDate: true, status: true },
        })
      : [];
    const eventById = new Map(events.map((event) => [event.id, event]));

    const pageCounts = new Map<string, number>();
    for (const visit of recentVisits) {
      pageCounts.set(visit.page, (pageCounts.get(visit.page) ?? 0) + 1);
    }

    return {
      counters: {
        visits24h,
        visits7d,
        visits30d,
        eventViews30d,
        registrations30d,
        remindersCreated30d,
        botUsers,
      },
      topEvents: topEvents.map((item) => ({
        eventId: item.eventId,
        views: item._count._all,
        event: eventById.get(item.eventId) ?? null,
      })),
      topPages7d: Array.from(pageCounts.entries())
        .map(([page, visits]) => ({ page, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10),
    };
  }
}
