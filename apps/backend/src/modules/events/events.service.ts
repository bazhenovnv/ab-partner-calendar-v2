import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { EventStatus, EventAutoStatus, Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Auto-status cron (every 5 min) ────────────────────────────────────────

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateAutoStatuses() {
    const nowMsk = this.nowMsk();

    // PLANNED → LIVE
    await this.prisma.event.updateMany({
      where: {
        isManualStatus: false,
        autoStatus: 'PLANNED',
        startDate: { lte: nowMsk },
        status: 'PUBLISHED',
      },
      data: { autoStatus: 'LIVE' },
    });

    // LIVE → COMPLETED (when endDate passed, or startDate + 3h if no endDate)
    const events = await this.prisma.event.findMany({
      where: { isManualStatus: false, autoStatus: 'LIVE', status: 'PUBLISHED' },
      select: { id: true, startDate: true, endDate: true },
    });

    for (const e of events) {
      const endMoment = e.endDate ?? new Date(e.startDate.getTime() + 3 * 60 * 60 * 1000);
      if (endMoment <= nowMsk) {
        await this.prisma.event.update({
          where: { id: e.id },
          data: { autoStatus: 'COMPLETED' },
        });
      }
    }
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  async getPublicEvents(query: EventsQueryDto) {
    const { date, city, directions, format, autoStatus, priceType, page = 1, limit = 6 } = query;

    const where: Prisma.EventWhereInput = {
      status: 'PUBLISHED',
    };

    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.startDate = { gte: d, lt: nextDay };
    }

    if (city) {
      where.OR = [
        { cityName: { contains: city, mode: 'insensitive' } },
        { city: { name: { contains: city, mode: 'insensitive' } } },
      ];
    }

    if (directions?.length) {
      where.directions = { some: { direction: { slug: { in: directions } } } };
    }

    if (format) where.format = format;
    if (autoStatus) where.autoStatus = autoStatus;
    if (priceType) where.priceType = priceType;

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          images: { select: { eventCardUrl: true, thumbnailUrl: true } },
          directions: { include: { direction: { select: { name: true, slug: true } } } },
          city: { select: { name: true, region: true } },
        },
      }),
    ]);

    // Fallback: if no active events, return last 6 completed
    if (events.length === 0 && !date) {
      const completed = await this.prisma.event.findMany({
        where: { status: 'PUBLISHED', autoStatus: 'COMPLETED' },
        take: 6,
        orderBy: { startDate: 'desc' },
        include: {
          images: { select: { eventCardUrl: true, thumbnailUrl: true } },
          directions: { include: { direction: { select: { name: true, slug: true } } } },
          city: { select: { name: true, region: true } },
        },
      });
      return { events: completed, total: completed.length, isFallback: true };
    }

    return { events, total, isFallback: false };
  }

  async getCalendarMarkers(query: CalendarQueryDto) {
    const { year, month } = query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const events = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: start, lte: end },
      },
      select: { startDate: true, endDate: true, autoStatus: true },
    });

    const dayMap: Record<string, { planned: number; live: number; completed: number }> = {};

    for (const e of events) {
      const dateStr = e.startDate.toISOString().split('T')[0];
      if (!dayMap[dateStr]) dayMap[dateStr] = { planned: 0, live: 0, completed: 0 };
      if (e.autoStatus === 'PLANNED') dayMap[dateStr].planned++;
      else if (e.autoStatus === 'LIVE') dayMap[dateStr].live++;
      else dayMap[dateStr].completed++;
    }

    return Object.entries(dayMap).map(([date, counts]) => ({ date, ...counts }));
  }

  async getMainEvents() {
    const events = await this.prisma.event.findMany({
      where: { status: 'PUBLISHED', mainEvent: true },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
      take: 10,
      include: {
        images: { select: { mainEventUrl: true } },
        city: { select: { name: true } },
      },
    });

    // Fallback to completed if no active main events
    const activeCount = events.filter(
      (e) => e.autoStatus === 'PLANNED' || e.autoStatus === 'LIVE',
    ).length;

    if (activeCount === 0) {
      return this.prisma.event.findMany({
        where: { status: 'PUBLISHED', mainEvent: true, autoStatus: 'COMPLETED' },
        orderBy: { startDate: 'desc' },
        take: 5,
        include: {
          images: { select: { mainEventUrl: true } },
          city: { select: { name: true } },
        },
      });
    }

    return events;
  }

  async getPublicEventById(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: {
        images: true,
        directions: { include: { direction: true } },
        city: true,
        tags: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getAdminEvents(query: EventsQueryDto) {
    const { status, search, page = 1, limit = 20 } = query;
    const where: Prisma.EventWhereInput = {};
    if (status) where.status = status as EventStatus;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { select: { thumbnailUrl: true } },
          city: { select: { name: true } },
        },
      }),
    ]);

    return { events, total };
  }

  async getNeedsAttention() {
    return this.prisma.event.findMany({
      where: { status: 'NEEDS_ATTENTION' },
      orderBy: { updatedAt: 'desc' },
      include: { images: true },
    });
  }

  async getAdminEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        images: true,
        directions: { include: { direction: true } },
        city: true,
        tags: true,
        versions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async createEvent(dto: CreateEventDto, userId: string) {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        startTime: dto.startTime,
        format: dto.format,
        cityId: dto.cityId,
        cityName: dto.cityName,
        address: dto.address,
        venue: dto.venue,
        eventUrl: dto.eventUrl,
        ticketUrl: dto.ticketUrl,
        ticketSalesEnabled: dto.ticketSalesEnabled ?? false,
        speaker: dto.speaker,
        priceType: dto.priceType,
        priceText: dto.priceText,
        mainEvent: dto.mainEvent ?? false,
        directions: dto.directionIds
          ? { create: dto.directionIds.map((id) => ({ directionId: id })) }
          : undefined,
        tags: dto.tags
          ? { create: dto.tags.map((tag) => ({ tag })) }
          : undefined,
      },
    });

    await this.logAction(userId, 'create', 'event', event.id, null, event);
    return event;
  }

  async updateEvent(id: string, dto: UpdateEventDto, userId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');

    await this.saveVersion(id, existing, userId);

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.fullDescription !== undefined && { fullDescription: dto.fullDescription }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.format !== undefined && { format: dto.format }),
        ...(dto.cityId !== undefined && { cityId: dto.cityId }),
        ...(dto.cityName !== undefined && { cityName: dto.cityName }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.venue !== undefined && { venue: dto.venue }),
        ...(dto.eventUrl !== undefined && { eventUrl: dto.eventUrl }),
        ...(dto.ticketUrl !== undefined && { ticketUrl: dto.ticketUrl }),
        ...(dto.ticketSalesEnabled !== undefined && { ticketSalesEnabled: dto.ticketSalesEnabled }),
        ...(dto.speaker !== undefined && { speaker: dto.speaker }),
        ...(dto.priceType !== undefined && { priceType: dto.priceType }),
        ...(dto.priceText !== undefined && { priceText: dto.priceText }),
        ...(dto.mainEvent !== undefined && { mainEvent: dto.mainEvent }),
        ...(dto.directionIds !== undefined && {
          directions: {
            deleteMany: {},
            create: dto.directionIds.map((dirId) => ({ directionId: dirId })),
          },
        }),
        ...(dto.tags !== undefined && {
          tags: { deleteMany: {}, create: dto.tags.map((tag) => ({ tag })) },
        }),
      },
    });

    await this.logAction(userId, 'update', 'event', id, existing, updated);
    return updated;
  }

  async setManualStatus(id: string, status: EventStatus, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        status,
        isManualStatus: true,
        manualStatusById: userId,
        manualStatusAt: new Date(),
      },
    });
    await this.logAction(userId, 'set_status', 'event', id, { status: event.status }, { status });
    return updated;
  }

  async publishEvent(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    this.validateForPublication(event);

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: event.publishedAt ?? new Date() },
    });
    await this.logAction(userId, 'publish', 'event', id, null, null);
    return updated;
  }

  async archiveEvent(id: string, userId: string) {
    await this.prisma.event.update({ where: { id }, data: { status: 'ARCHIVE' } });
    await this.logAction(userId, 'archive', 'event', id, null, null);
  }

  async deleteEvent(id: string, userId: string) {
    await this.prisma.event.update({ where: { id }, data: { status: 'DELETED' } });
    await this.logAction(userId, 'delete', 'event', id, null, null);
  }

  async getVersions(id: string) {
    return this.prisma.eventVersion.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async restoreVersion(id: string, versionId: string, userId: string) {
    const version = await this.prisma.eventVersion.findFirst({
      where: { id: versionId, eventId: id },
    });
    if (!version) throw new NotFoundException('Version not found');

    const snapshot = version.snapshot as any;
    return this.updateEvent(id, snapshot, userId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private validateForPublication(event: any) {
    const criticalMissing: string[] = [];
    if (!event.title) criticalMissing.push('title');
    if (!event.startDate) criticalMissing.push('date');
    if (!event.startTime) criticalMissing.push('time');
    if (!event.eventUrl) criticalMissing.push('eventUrl');
    if (!event.images?.eventCardUrl && !event.images?.originalUrl) criticalMissing.push('image');

    if (criticalMissing.length > 0) {
      throw new BadRequestException(`Missing required fields: ${criticalMissing.join(', ')}`);
    }
  }

  private nowMsk(): Date {
    const now = new Date();
    const mskOffset = 3 * 60 * 60 * 1000;
    return new Date(now.getTime() + mskOffset - now.getTimezoneOffset() * 60000);
  }

  private async saveVersion(eventId: string, snapshot: any, userId: string) {
    await this.prisma.eventVersion.create({
      data: { eventId, snapshot, createdBy: userId },
    });
  }

  private async logAction(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    before: any,
    after: any,
  ) {
    await this.prisma.actionLog.create({
      data: { userId, action, entity, entityId, before, after },
    });
  }
}
