import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateCityDto {
  name: string;
  region: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCityDto {
  name?: string;
  region?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ListCitiesQuery {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'sortOrder' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCitiesQuery) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'sortOrder',
      sortDir = 'asc',
    } = query;

    const where = {
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    };

    const [total, cities] = await Promise.all([
      this.prisma.city.count({ where }),
      this.prisma.city.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { name: 'asc' }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { _count: { select: { events: true } } },
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), cities };
  }

  async findById(id: string) {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: { _count: { select: { events: true } } },
    });
    if (!city) throw new NotFoundException(`Город ${id} не найден`);
    return city;
  }

  async create(dto: CreateCityDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Название обязательно');
    if (!dto.region?.trim()) throw new BadRequestException('Регион обязателен');

    const existing = await this.prisma.city.findUnique({ where: { name: dto.name.trim() } });
    if (existing) throw new ConflictException(`Город «${dto.name}» уже существует`);

    return this.prisma.city.create({
      data: {
        name: dto.name.trim(),
        region: dto.region.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.findById(id);

    if (dto.name !== undefined) {
      const dup = await this.prisma.city.findFirst({
        where: { name: dto.name.trim(), id: { not: id } },
      });
      if (dup) throw new ConflictException(`Город «${dto.name}» уже существует`);
    }

    return this.prisma.city.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.region !== undefined ? { region: dto.region.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: Number(dto.sortOrder) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async toggle(id: string) {
    const city = await this.findById(id);
    return this.prisma.city.update({ where: { id }, data: { isActive: !city.isActive } });
  }

  async remove(id: string) {
    const city = await this.findById(id) as Awaited<ReturnType<typeof this.findById>>;
    const count = (city as unknown as { _count: { events: number } })._count.events;
    if (count > 0) {
      return this.prisma.city.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.city.delete({ where: { id } });
  }
}
