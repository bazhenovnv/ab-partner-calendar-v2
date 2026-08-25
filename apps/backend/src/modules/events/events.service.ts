import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { EventStatus, EventAutoStatus, Prisma } from '@prisma/client';

type AttentionGuidanceItem = {
  reason: string;
  action: string;
  blocking: boolean;
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private applyPublicFilters(
    where: Prisma.EventWhereInput,
    query: Pick<
      EventsQueryDto,
      'city' | 'regions' | 'cities' | 'directions' | 'format' | 'autoStatus' | 'priceType'
    >,
  ) {
    const locationFilters: Prisma.EventWhereInput[] = [];

    if (query.city) {
      locationFilters.push(
        { cityName: { contains: query.city, mode: 'insensitive' } },
        { city: { name: { contains: query.city, mode: 'insensitive' } } },
      );
    }

    for (const city of query.cities ?? []) {
      locationFilters.push(
        { cityName: { equals: city, mode: 'insensitive' } },
        { city: { name: { equals: city, mode: 'insensitive' } } },
      );
    }

    for (const region of query.regions ?? []) {
      locationFilters.push(
        { city: { region: { equals: region, mode: 'insensitive' } } },
        { cityName: { startsWith: region, mode: 'insensitive' } },
      );
    }

    if (locationFilters.length > 0) where.AND = [{ OR: locationFilters }];
    if (query.directions?.length) {
      where.directions = { some: { direction: { slug: { in: query.directions } } } };
    }
    if (query.format) where.format = query.format;
    if (query.autoStatus?.length) where.autoStatus = { in: query.autoStatus };
    if (query.priceType) where.priceType = query.priceType;
  }

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
    const { date, page = 1, limit = 6 } = query;

    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
    };

    // Without a selected date, show only current and upcoming events.
    // When a specific calendar date is selected, include all published
    // events for that date, including completed ones.
    if (query.autoStatus?.length) {
      where.autoStatus = { in: query.autoStatus };
    } else if (!date) {
      where.autoStatus = {
        in: [
          EventAutoStatus.PLANNED,
          EventAutoStatus.LIVE,
        ],
      };
    }

    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.startDate = { gte: d, lt: nextDay };
    }

    this.applyPublicFilters(where, query);

    console.log('PUBLIC EVENTS QUERY', {
      query,
      where,
    });

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

    // Fallback is allowed only for the unfiltered first page when
    // the public catalogue contains no matching events at all.
    const hasFilters = Boolean(
      date ||
      query.city ||
      query.regions?.length ||
      query.cities?.length ||
      query.format ||
      query.autoStatus?.length ||
      query.priceType ||
      query.directions?.length,
    );

    if (events.length === 0 && page === 1 && !hasFilters) {
      const completed = await this.prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          autoStatus: EventAutoStatus.COMPLETED,
        },
        take: 6,
        orderBy: { startDate: 'desc' },
        include: {
          images: {
            select: {
              eventCardUrl: true,
              thumbnailUrl: true,
              originalUrl: true,
            },
          },
          directions: {
            include: {
              direction: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
          city: {
            select: {
              name: true,
              region: true,
            },
          },
        },
      });

      return {
        events: completed,
        total: completed.length,
        isFallback: true,
      };
    }

    return { events, total, isFallback: false };
  }

  async getCalendarMarkers(query: CalendarQueryDto) {
    const { year, month } = query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const where: Prisma.EventWhereInput = {
      status: 'PUBLISHED',
      startDate: { gte: start, lte: end },
    };
    this.applyPublicFilters(where, query);

    const events = await this.prisma.event.findMany({
      where,
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
    const limit = 5;

    const include = {
      images: {
        select: {
          mainEventUrl: true,
          originalUrl: true,
          eventCardUrl: true,
          thumbnailUrl: true,
        },
      },
      directions: {
        include: {
          direction: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
      city: {
        select: {
          name: true,
          region: true,
        },
      },
    } satisfies Prisma.EventInclude;

    const commonWhere: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      mainEvent: true,
      images: {
        some: {
          mainEventUrl: {
            not: null,
          },
        },
      },
    };

    const activeEvents = await this.prisma.event.findMany({
      where: {
        ...commonWhere,
        autoStatus: {
          in: [
            EventAutoStatus.PLANNED,
            EventAutoStatus.LIVE,
          ],
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { startDate: 'asc' },
      ],
      take: limit,
      include,
    });

    if (activeEvents.length >= limit) {
      return activeEvents.slice(0, limit);
    }

    const completedEvents = await this.prisma.event.findMany({
      where: {
        ...commonWhere,
        autoStatus: EventAutoStatus.COMPLETED,
        id: {
          notIn: activeEvents.map((event) => event.id),
        },
      },
      orderBy: [
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit - activeEvents.length,
      include,
    });

    return [...activeEvents, ...completedEvents].slice(0, limit);
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
    const events = await this.prisma.event.findMany({
      where: { status: 'NEEDS_ATTENTION' },
      orderBy: { updatedAt: 'desc' },
      include: {
        images: true,
        directions: { include: { direction: true } },
        city: true,
        tags: true,
      },
    });

    return events.map((event) => this.decorateAttention(event));
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
    return this.decorateAttention(event);
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
        isOnline: dto.format === 'ONLINE' || dto.format === 'HYBRID',
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
        ...(dto.format !== undefined && {
          format: dto.format,
          isOnline: dto.format === 'ONLINE' || dto.format === 'HYBRID',
        }),
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
      include: {
        images: true,
        city: true,
        directions: { include: { direction: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    this.validateForPublication(event);

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: event.publishedAt ?? new Date(),
        attentionReasons: [],
      },
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

  private hasEventImage(images: any[] | null | undefined): boolean {
    return Boolean(
      images?.some((image) =>
        Boolean(
          image?.eventCardUrl ||
          image?.originalUrl ||
          image?.thumbnailUrl ||
          image?.mainEventUrl ||
          image?.modalUrl,
        ),
      ),
    );
  }

  private publicationIssues(event: any): AttentionGuidanceItem[] {
    const issues: AttentionGuidanceItem[] = [];
    const add = (reason: string, action: string) => {
      issues.push({ reason, action, blocking: true });
    };

    if (!event.title?.trim() || event.title.trim().length < 2 || event.title.trim() === 'Без названия') {
      add('Не указан корректный заголовок', 'Укажите понятное название мероприятия.');
    }
    if (!event.startDate) {
      add('Не указана дата мероприятия', 'Укажите дату начала мероприятия.');
    }
    if (!event.format) {
      add('Не определён формат мероприятия', 'Выберите формат: онлайн, офлайн или онлайн + офлайн.');
    }
    if (
      (event.format === 'OFFLINE' || event.format === 'HYBRID') &&
      !event.cityName?.trim() &&
      !event.city?.name?.trim()
    ) {
      add('Не определён город очного участия', 'Укажите город, где проходит очная часть мероприятия.');
    }
    if (!this.hasEventImage(event.images)) {
      add('Изображение события отсутствует', 'Загрузите изображение мероприятия. Без изображения событие не публикуется автоматически.');
    }

    return issues;
  }

  private attentionAction(reason: string): string {
    const normalized = reason.toLocaleLowerCase('ru-RU');
    if (normalized.includes('изображ')) {
      return 'Проверьте изображение мероприятия и при необходимости загрузите его вручную.';
    }
    if (normalized.includes('гибрид') || normalized.includes('очно')) {
      return 'Проверьте формат «Онлайн + офлайн», город, площадку и адрес очной части.';
    }
    if (normalized.includes('заголов')) {
      return 'Проверьте и заполните название мероприятия.';
    }
    if (normalized.includes('дат')) {
      return 'Проверьте дату начала и окончания мероприятия.';
    }
    if (normalized.includes('формат')) {
      return 'Выберите корректный формат мероприятия.';
    }
    if (normalized.includes('город') || normalized.includes('мест')) {
      return 'Укажите корректный город, площадку и адрес очного мероприятия.';
    }
    if (normalized.includes('направлен')) {
      return 'Выберите хотя бы одно подходящее направление мероприятия.';
    }
    if (normalized.includes('подборк')) {
      return 'Это пост с несколькими мероприятиями. Проверьте, нужно ли разделить его на отдельные события.';
    }
    return 'Проверьте данные события в карточке и исправьте указанную причину перед публикацией.';
  }

  private sourceAttentionReasons(event: any): string[] {
    const reasons = new Set<string>(event.attentionReasons ?? []);
    const sourceText = String(event.fullDescription ?? '');

    if (
      /ПОДБОРКА\s+(НЕДЕЛИ|МЕСЯЦА|ДНЯ)/i.test(sourceText) ||
      /АБ\s+АФИША\s+БУХГАЛТЕРА[:：]\s*ЧТО\s+ПОСМОТРЕТЬ/i.test(sourceText) ||
      /\b(?:мероприятия|вебинары|семинары)\s+на\s+(?:неделю|месяц)\b/i.test(sourceText)
    ) {
      reasons.add('Пост-подборка: требуется ручная обработка без автоматического разделения');
    }

    if (!event.directions?.length) {
      reasons.add('Направление отсутствует или не найдено в справочнике');
    }

    return [...reasons];
  }

  private decorateAttention(event: any) {
    const publicationIssues = this.publicationIssues(event);
    const reasonGuidance = this.sourceAttentionReasons(event).map((reason) => ({
      reason,
      action: this.attentionAction(reason),
      blocking: true,
    }));

    const seen = new Set(reasonGuidance.map((item) => item.reason));
    for (const issue of publicationIssues) {
      if (!seen.has(issue.reason)) {
        reasonGuidance.push(issue);
        seen.add(issue.reason);
      }
    }

    return {
      ...event,
      attentionGuidance: reasonGuidance,
      publicationIssues,
      publicationReady: publicationIssues.length === 0,
    };
  }

  private validateForPublication(event: any) {
    const issues = this.publicationIssues(event);
    if (issues.length > 0) {
      throw new BadRequestException(
        `Для публикации нужно исправить: ${issues.map((issue) => issue.reason).join('; ')}`,
      );
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
