import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MaxParserService } from './max-parser.service';

export interface MaxRecoveryResult {
  scanned: number;
  published: number;
  keptForReview: number;
  failed: number;
}

@Injectable()
export class MaxImportRecoveryService {
  private readonly logger = new Logger(MaxImportRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: MaxParserService,
  ) {}

  async reprocessPending(limit = 500): Promise<MaxRecoveryResult> {
    const events = await this.prisma.event.findMany({
      where: {
        source: 'MAX',
        status: { in: ['DRAFT', 'NEEDS_ATTENTION'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        images: true,
        directions: true,
        tags: true,
      },
    });

    const result: MaxRecoveryResult = {
      scanned: events.length,
      published: 0,
      keptForReview: 0,
      failed: 0,
    };

    for (const event of events) {
      try {
        const sourceText =
          event.fullDescription?.trim() ||
          [event.title, event.shortDescription]
            .filter((value): value is string => Boolean(value?.trim()))
            .join('\n');

        const parsed = this.parser.parse(
          sourceText,
          event.createdAt,
          event.eventUrl ? [event.eventUrl] : [],
        );

        const resolvedDirections = await this.prisma.direction.findMany({
          where: {
            slug: { in: parsed.directionSlugs },
            isActive: true,
          },
          select: { id: true },
        });

        const directionIds = resolvedDirections.length > 0
          ? resolvedDirections.map((direction) => direction.id)
          : event.directions.map((direction) => direction.directionId);

        const hasImage = event.images.some(
          (image) =>
            Boolean(
              image.eventCardUrl ||
              image.originalUrl ||
              image.thumbnailUrl ||
              image.mainEventUrl,
            ),
        );

        const nextFormat = parsed.format ?? event.format;
        const publishable = !parsed.needsAttention && hasImage;
        const nextStatus = publishable ? 'PUBLISHED' : 'NEEDS_ATTENTION';
        const nextStartDate = parsed.startDate ?? event.startDate;
        const nextStartTime = parsed.startTime ?? event.startTime;
        const autoStatus = this.getAutoStatus(nextStartDate, nextStartTime);
        const nextTags = [
          ...new Set([
            ...event.tags.map((tag) => tag.tag),
            ...parsed.tags,
            ...(!hasImage ? ['missing-event-image'] : []),
          ]),
        ];

        await this.prisma.event.update({
          where: { id: event.id },
          data: {
            title: parsed.title ?? event.title,
            shortDescription: parsed.shortDescription ?? event.shortDescription,
            fullDescription: parsed.fullDescription ?? event.fullDescription,
            startDate: nextStartDate,
            endDate: parsed.endDate ?? event.endDate,
            startTime: nextStartTime,
            timezone: parsed.timezone || event.timezone,
            format: nextFormat,
            isOnline: nextFormat === 'ONLINE',
            cityName: parsed.city ?? event.cityName,
            venue: parsed.venue ?? event.venue,
            address: parsed.address ?? event.address,
            eventUrl: parsed.eventUrl ?? event.eventUrl,
            priceType: parsed.priceType ?? event.priceType,
            priceText: parsed.priceText ?? event.priceText,
            speaker: parsed.speaker ?? event.speaker,
            mainEvent: event.mainEvent || parsed.mainEvent,
            status: nextStatus,
            autoStatus,
            publishedAt: publishable ? event.publishedAt ?? new Date() : null,
            lastSyncedAt: new Date(),
            directions: directionIds.length > 0
              ? {
                  deleteMany: {},
                  create: directionIds.map((directionId) => ({ directionId })),
                }
              : undefined,
            tags: {
              deleteMany: {},
              create: nextTags.map((tag) => ({ tag })),
            },
          },
        });

        if (publishable) {
          result.published++;
          this.logger.log(
            `Recovered MAX event ${event.externalId ?? event.id}: ${parsed.title ?? event.title}`,
          );
        } else {
          result.keptForReview++;
          this.logger.warn(
            `MAX event ${event.externalId ?? event.id} still needs review: ` +
              `${[...parsed.attentionReasons, ...(!hasImage ? ['Изображение отсутствует'] : [])].join(', ')}`,
          );
        }
      } catch (error) {
        result.failed++;
        this.logger.error(
          `MAX recovery failed for ${event.externalId ?? event.id}: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return result;
  }

  private getAutoStatus(
    startDate: Date,
    startTime: string | null,
  ): 'PLANNED' | 'LIVE' | 'COMPLETED' {
    const [hours, minutes] = (startTime ?? '12:00')
      .split(':')
      .map((value) => Number(value));
    const startMoment = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        Math.max(0, Math.min(23, hours || 0)) - 3,
        Math.max(0, Math.min(59, minutes || 0)),
        0,
      ),
    );
    const now = new Date();

    if (now < startMoment) return 'PLANNED';
    if (now.getTime() < startMoment.getTime() + 3 * 60 * 60 * 1000) {
      return 'LIVE';
    }
    return 'COMPLETED';
  }
}
