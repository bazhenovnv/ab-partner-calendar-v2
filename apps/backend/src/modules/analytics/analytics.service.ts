import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const EVENT_ACTIONS = new Set(['view', 'register', 'ticket', 'participate']);

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackVisit(page: string, sessionId?: string | null) {
    const normalizedPage = page.trim().slice(0, 500) || '/';
    return this.prisma.siteVisit.create({
      data: {
        page: normalizedPage,
        sessionId: sessionId?.trim().slice(0, 100) || null,
      },
      select: { id: true },
    });
  }

  async trackEvent(eventId: string, action: string, sessionId?: string | null) {
    if (!EVENT_ACTIONS.has(action)) {
      throw new NotFoundException('Unsupported analytics action');
    }
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    return this.prisma.eventView.create({
      data: {
        eventId,
        action,
        sessionId: sessionId?.trim().slice(0, 100) || null,
      },
      select: { id: true },
    });
  }

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
      this.prisma.eventView.count({ where: { createdAt: { gte: monthAgo }, action: 'view' } }),
      this.prisma.eventView.count({
        where: { createdAt: { gte: monthAgo }, action: { in: ['register', 'ticket', 'participate'] } },
      }),
      this.prisma.reminder.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.botUser.count(),
      this.prisma.eventView.groupBy({
        by: ['eventId'],
        where: { createdAt: { gte: monthAgo }, action: 'view' },
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
