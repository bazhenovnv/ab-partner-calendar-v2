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

const NON_CITY = /^(?:онлайн|online|очно|офлайн|offline|дистанционно)$/i;
const VENUE_PREFIX = /^(?:отель|гостиниц|бизнес[-\s]?центр|бц\b|конференц|центр\b|зал\b|офис\b|ресторан\b|кафе\b)/i;
const STREET_PART = /^(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|шоссе|наб\.?|набережная|бульвар|бул\.?|пл\.?|площадь|д\.?\s*\d|дом\b)/i;
const REGION_PART = /(?:обл\.?|область|край|респ\.?|республика|автономн|округ|ао)$/i;

function cleanLocationPart(value: string) {
  return value
    .trim()
    .replace(/^(?:г\.|город)\s*/i, '')
    .replace(/^['«"]|['»"]$/g, '')
    .trim();
}

function inferCityAndRegion(input: {
  cityName: string | null;
  address: string | null;
}) {
  const addressParts = (input.address ?? '')
    .split(',')
    .map(cleanLocationPart)
    .filter(Boolean);

  let region = 'Не указан';
  let regionIndex = -1;
  for (let index = addressParts.length - 1; index >= 0; index -= 1) {
    if (REGION_PART.test(addressParts[index])) {
      region = addressParts[index];
      regionIndex = index;
      break;
    }
  }

  const endIndex = regionIndex >= 0 ? regionIndex - 1 : addressParts.length - 1;
  for (let index = endIndex; index >= 0; index -= 1) {
    const candidate = addressParts[index];
    if (!candidate || /^\d+[а-яa-z/-]*$/i.test(candidate)) continue;
    if (STREET_PART.test(candidate) || REGION_PART.test(candidate)) continue;
    if (VENUE_PREFIX.test(candidate) || NON_CITY.test(candidate)) continue;
    if (!/[а-яёa-z]/i.test(candidate)) continue;
    return { name: candidate, region };
  }

  const fallback = cleanLocationPart(input.cityName ?? '');
  if (
    fallback &&
    !NON_CITY.test(fallback) &&
    !VENUE_PREFIX.test(fallback) &&
    !STREET_PART.test(fallback)
  ) {
    return { name: fallback, region };
  }

  return null;
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

  async reconcileFromEvents() {
    const events = await this.prisma.event.findMany({
      where: {
        format: 'OFFLINE',
        status: { not: 'DELETED' },
      },
      select: {
        id: true,
        cityId: true,
        cityName: true,
        address: true,
      },
    });

    let created = 0;
    let linked = 0;
    let corrected = 0;
    const cityNames = new Set<string>();

    for (const event of events) {
      const inferred = inferCityAndRegion(event);
      if (!inferred) continue;
      cityNames.add(inferred.name);

      let city = await this.prisma.city.findUnique({ where: { name: inferred.name } });
      if (!city) {
        city = await this.prisma.city.create({
          data: {
            name: inferred.name,
            region: inferred.region,
            isActive: true,
          },
        });
        created += 1;
      } else if (city.region === 'Не указан' && inferred.region !== 'Не указан') {
        city = await this.prisma.city.update({
          where: { id: city.id },
          data: { region: inferred.region },
        });
      }

      const cityNameChanged = event.cityName !== city.name;
      const cityLinkChanged = event.cityId !== city.id;
      if (cityNameChanged || cityLinkChanged) {
        await this.prisma.event.update({
          where: { id: event.id },
          data: { cityId: city.id, cityName: city.name },
        });
        if (cityLinkChanged) linked += 1;
        if (cityNameChanged) corrected += 1;
      }
    }

    return {
      scanned: events.length,
      detected: cityNames.size,
      created,
      linked,
      corrected,
    };
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
