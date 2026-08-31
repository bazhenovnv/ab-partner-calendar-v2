import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EditorialService } from './editorial.service';

@Injectable()
export class EditorialSchedulerService {
  private readonly logger = new Logger(EditorialSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly editorial: EditorialService,
  ) {}

  async schedule(id: string, channelKeys: string[] | undefined, scheduledAtValue: string | undefined) {
    const post = await this.prisma.editorialPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException(`Editorial post ${id} not found`);
    if (!['DRAFT', 'FAILED', 'PARTIAL_FAILED', 'SCHEDULED'].includes(post.status)) {
      throw new BadRequestException('Эту публикацию уже нельзя запланировать');
    }

    const scheduledAt = scheduledAtValue ? new Date(scheduledAtValue) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Укажите корректные дату и время размещения');
    }
    if (scheduledAt.getTime() < Date.now() + 15_000) {
      throw new BadRequestException('Время размещения должно быть хотя бы на 15 секунд позже текущего времени');
    }

    const knownKeys = new Set(this.editorial.getChannels().map((channel) => channel.key));
    const selectedKeys = Array.from(
      new Set((channelKeys?.length ? channelKeys : post.channelKeys).map(String).filter((key) => knownKeys.has(key))),
    );
    if (!selectedKeys.length) {
      throw new BadRequestException('Выберите хотя бы один канал публикации');
    }

    const updated = await this.prisma.editorialPost.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt,
        channelKeys: selectedKeys,
      },
    });

    return {
      ok: true,
      status: updated.status,
      scheduledAt: updated.scheduledAt,
      channelKeys: updated.channelKeys,
    };
  }

  async updatePost(id: string, dto: Record<string, unknown>) {
    const post = await this.prisma.editorialPost.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!post) throw new NotFoundException(`Editorial post ${id} not found`);

    if (post.status === 'SCHEDULED') {
      const cancelled = await this.prisma.editorialPost.updateMany({
        where: { id, status: 'SCHEDULED' },
        data: { status: 'DRAFT', scheduledAt: null },
      });
      if (cancelled.count !== 1) {
        throw new BadRequestException('Запланированная публикация уже начала размещаться. Обновите страницу.');
      }
    }

    return this.editorial.update(id, dto);
  }

  @Cron('*/15 * * * * *')
  async publishDue() {
    const duePosts = await this.prisma.editorialPost.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
      select: {
        id: true,
        channelKeys: true,
        scheduledAt: true,
      },
    });

    for (const post of duePosts) {
      const claimed = await this.prisma.editorialPost.updateMany({
        where: { id: post.id, status: 'SCHEDULED' },
        data: { status: 'PUBLISHING' },
      });
      if (claimed.count !== 1) continue;

      try {
        await this.editorial.publish(post.id, post.channelKeys);
        this.logger.log(
          `Scheduled editorial post ${post.id} published (scheduledAt=${post.scheduledAt?.toISOString() || 'n/a'})`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Scheduled editorial post ${post.id} failed: ${message}`);
        await this.prisma.$transaction([
          this.prisma.editorialPost.update({
            where: { id: post.id },
            data: { status: 'FAILED' },
          }),
          this.prisma.errorLog.create({
            data: {
              context: 'editorial.schedule',
              message,
              payload: {
                postId: post.id,
                scheduledAt: post.scheduledAt?.toISOString() || null,
              },
            },
          }),
        ]);
      }
    }

    return { processed: duePosts.length };
  }
}
