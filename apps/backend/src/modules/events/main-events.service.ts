import { Injectable } from '@nestjs/common';
import { EventAutoStatus, EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAIN_EVENTS_WINDOW_SIZE = 5;

@Injectable()
export class MainEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMainEvents() {
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

    // Do not cap active main events. The frontend carousel keeps only five
    // visible at a time and advances its five-event window through this full
    // ordered sequence before wrapping back to the first event.
    const activeEvents = await this.prisma.event.findMany({
      where: {
        ...commonWhere,
        autoStatus: {
          in: [EventAutoStatus.PLANNED, EventAutoStatus.LIVE],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
      include,
    });

    if (activeEvents.length >= MAIN_EVENTS_WINDOW_SIZE) {
      return activeEvents;
    }

    // Preserve the existing fallback contract when there are fewer than five
    // active main events: fill only the missing slots with the most recently
    // completed main events. Completed events never displace active ones.
    const completedEvents = await this.prisma.event.findMany({
      where: {
        ...commonWhere,
        autoStatus: EventAutoStatus.COMPLETED,
        id: {
          notIn: activeEvents.map((event) => event.id),
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      take: MAIN_EVENTS_WINDOW_SIZE - activeEvents.length,
      include,
    });

    return [...activeEvents, ...completedEvents];
  }
}
