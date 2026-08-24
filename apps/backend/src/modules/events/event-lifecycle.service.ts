import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const RESTORABLE_STATUSES: EventStatus[] = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
  EventStatus.HIDDEN,
  EventStatus.NEEDS_ATTENTION,
];

type StatusSnapshot = { status?: unknown } | null | undefined;

function statusFromJson(value: Prisma.JsonValue | null): EventStatus | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = (value as StatusSnapshot).status;
  if (typeof candidate !== 'string') return null;
  return RESTORABLE_STATUSES.includes(candidate as EventStatus)
    ? (candidate as EventStatus)
    : null;
}

@Injectable()
export class EventLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async archiveEvent(id: string, userId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.status === EventStatus.ARCHIVE) {
      throw new BadRequestException('Мероприятие уже находится в архиве');
    }
    if (existing.status === EventStatus.DELETED) {
      throw new BadRequestException('Удалённое мероприятие нельзя архивировать');
    }

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.event.updateMany({
        where: { id, status: existing.status },
        data: { status: EventStatus.ARCHIVE },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Статус мероприятия уже изменён. Обновите страницу.');
      }

      await tx.actionLog.create({
        data: {
          userId,
          action: 'archive',
          entity: 'event',
          entityId: id,
          before: { status: existing.status },
          after: { status: EventStatus.ARCHIVE },
        },
      });
    });

    return this.getAdminEvent(id);
  }

  async deleteEvent(id: string, userId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.status === EventStatus.DELETED) {
      throw new BadRequestException('Мероприятие уже удалено');
    }

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.event.updateMany({
        where: { id, status: existing.status },
        data: { status: EventStatus.DELETED },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Статус мероприятия уже изменён. Обновите страницу.');
      }

      await tx.actionLog.create({
        data: {
          userId,
          action: 'delete',
          entity: 'event',
          entityId: id,
          before: { status: existing.status },
          after: { status: EventStatus.DELETED },
        },
      });
    });
  }

  async restoreEvent(id: string, userId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    if (![EventStatus.ARCHIVE, EventStatus.DELETED].includes(existing.status)) {
      throw new BadRequestException('Восстановить можно только архивное или удалённое мероприятие');
    }

    const restoreStatus = await this.resolveRestoreStatus(id, existing.status, existing.publishedAt);

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.event.updateMany({
        where: { id, status: existing.status },
        data: { status: restoreStatus },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Статус мероприятия уже изменён. Обновите страницу.');
      }

      await tx.actionLog.create({
        data: {
          userId,
          action: 'restore',
          entity: 'event',
          entityId: id,
          before: { status: existing.status },
          after: { status: restoreStatus },
        },
      });
    });

    return this.getAdminEvent(id);
  }

  private async resolveRestoreStatus(
    eventId: string,
    currentStatus: EventStatus,
    publishedAt: Date | null,
  ): Promise<EventStatus> {
    const logs = await this.prisma.actionLog.findMany({
      where: {
        entity: 'event',
        entityId: eventId,
        action: { in: ['archive', 'delete'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { action: true, before: true },
    });

    if (currentStatus === EventStatus.ARCHIVE) {
      const archive = logs.find((log) => log.action === 'archive');
      const previous = statusFromJson(archive?.before ?? null);
      if (previous) return previous;
    }

    if (currentStatus === EventStatus.DELETED) {
      const deletion = logs.find((log) => log.action === 'delete');
      const previousDeleteStatus = statusFromJson(deletion?.before ?? null);
      if (previousDeleteStatus) return previousDeleteStatus;

      // A normal lifecycle is PUBLISHED/DRAFT/... -> ARCHIVE -> DELETED.
      // For records created before status snapshots were introduced, old audit
      // entries have before=null. Never expose such a legacy record publicly
      // merely because publishedAt exists; restore it into a safe review state.
      const archive = logs.find((log) => log.action === 'archive');
      const previousArchiveStatus = statusFromJson(archive?.before ?? null);
      if (previousArchiveStatus) return previousArchiveStatus;
    }

    return publishedAt ? EventStatus.HIDDEN : EventStatus.DRAFT;
  }

  private async getAdminEvent(id: string) {
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
}
