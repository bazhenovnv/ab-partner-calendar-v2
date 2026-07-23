import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateDirectionDto {
  name: string;
  slug: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateDirectionDto {
  name?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ListDirectionsQuery {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'sortOrder' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

@Injectable()
export class DirectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListDirectionsQuery) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'sortOrder',
      sortDir = 'asc',
    } = query;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    };

    const [total, directions] = await Promise.all([
      this.prisma.direction.count({ where }),
      this.prisma.direction.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { name: 'asc' }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { _count: { select: { events: true } } },
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), directions };
  }

  async findById(id: string) {
    const direction = await this.prisma.direction.findUnique({
      where: { id },
      include: { _count: { select: { events: true } } },
    });
    if (!direction) throw new NotFoundException(`Направление ${id} не найдено`);
    return direction;
  }

  async create(dto: CreateDirectionDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Название обязательно');
    if (!dto.slug?.trim()) throw new BadRequestException('Slug обязателен');
    if (!/^[a-z0-9-]+$/.test(dto.slug)) {
      throw new BadRequestException('Slug может содержать только строчные латинские буквы, цифры и дефисы');
    }

    const [nameConflict, slugConflict] = await Promise.all([
      this.prisma.direction.findUnique({ where: { name: dto.name.trim() } }),
      this.prisma.direction.findUnique({ where: { slug: dto.slug.trim() } }),
    ]);
    if (nameConflict) throw new ConflictException(`Направление «${dto.name}» уже существует`);
    if (slugConflict) throw new ConflictException(`Slug «${dto.slug}» уже занят`);

    return this.prisma.direction.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDirectionDto) {
    await this.findById(id);

    if (dto.name !== undefined) {
      const dup = await this.prisma.direction.findFirst({
        where: { name: dto.name.trim(), id: { not: id } },
      });
      if (dup) throw new ConflictException(`Направление «${dto.name}» уже существует`);
    }

    if (dto.slug !== undefined) {
      if (!/^[a-z0-9-]+$/.test(dto.slug)) {
        throw new BadRequestException('Slug может содержать только строчные латинские буквы, цифры и дефисы');
      }
      const dup = await this.prisma.direction.findFirst({
        where: { slug: dto.slug.trim(), id: { not: id } },
      });
      if (dup) throw new ConflictException(`Slug «${dto.slug}» уже занят`);
    }

    return this.prisma.direction.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: Number(dto.sortOrder) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async toggle(id: string) {
    const direction = await this.findById(id);
    return this.prisma.direction.update({
      where: { id },
      data: { isActive: !direction.isActive },
    });
  }

  async remove(id: string) {
    const direction = await this.findById(id);
    const count = (direction as unknown as { _count: { events: number } })._count.events;
    if (count > 0) {
      return this.prisma.direction.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.direction.delete({ where: { id } });
  }
}
