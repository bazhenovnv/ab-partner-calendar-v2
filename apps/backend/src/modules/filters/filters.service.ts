import { Injectable } from '@nestjs/common';
import { EventAutoStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface FacetQuery {
  cities?: string[];
  directions?: string[];
  format?: 'ONLINE' | 'OFFLINE';
  priceType?: 'FREE' | 'PAID';
  autoStatus?: EventAutoStatus[];
}

@Injectable()
export class FiltersService {
  constructor(private readonly prisma: PrismaService) {}

  getDirections() {
    return this.prisma.direction.findMany({
      where: {
        isActive: true,
        events: {
          some: {
            event: { status: 'PUBLISHED' },
          },
        },
      },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  private commonFacetWhere(query: FacetQuery): Prisma.EventWhereInput {
    const where: Prisma.EventWhereInput = { status: 'PUBLISHED' };

    if (query.directions?.length) {
      where.directions = { some: { direction: { slug: { in: query.directions } } } };
    }
    if (query.format) where.format = query.format;
    if (query.priceType) where.priceType = query.priceType;

    return where;
  }

  private cityConstraint(cities: string[]): Prisma.EventWhereInput {
    const locationFilters: Prisma.EventWhereInput[] = [];
    for (const city of cities) {
      locationFilters.push(
        { cityName: { equals: city, mode: 'insensitive' } },
        { city: { name: { equals: city, mode: 'insensitive' } } },
      );
    }
    return locationFilters.length > 0 ? { OR: locationFilters } : {};
  }

  private async citiesForWhere(where: Prisma.EventWhereInput) {
    const eventLocations = await this.prisma.event.findMany({
      where: {
        ...where,
        OR: [
          { cityId: { not: null } },
          { cityName: { not: null } },
        ],
      },
      select: {
        cityName: true,
        city: {
          select: { id: true, name: true, region: true },
        },
      },
    });

    const locationKey = (name: string, region: string) =>
      `${region.trim().toLocaleLowerCase('ru')}::${name.trim().toLocaleLowerCase('ru')}`;
    const citiesByLocation = new Map<string, { id: string; name: string; region: string }>();

    for (const eventLocation of eventLocations) {
      if (eventLocation.city) {
        const relatedCity = eventLocation.city;
        const key = locationKey(relatedCity.name, relatedCity.region);
        if (!citiesByLocation.has(key)) citiesByLocation.set(key, relatedCity);
      }

      const name = eventLocation.cityName?.trim();
      const normalizedName = name?.toLocaleLowerCase('ru');
      if (!name || !normalizedName || normalizedName === 'онлайн') continue;

      const alreadyRepresented = Array.from(citiesByLocation.values()).some(
        (city) => city.name.toLocaleLowerCase('ru') === normalizedName,
      );
      if (alreadyRepresented) continue;

      const inferredRegion = name.split(',')[0]?.trim() || 'Другие регионы';
      citiesByLocation.set(locationKey(name, inferredRegion), {
        id: `event-city:${normalizedName}`,
        name,
        region: inferredRegion,
      });
    }

    return Array.from(citiesByLocation.values()).sort((a, b) =>
      a.region.localeCompare(b.region, 'ru') || a.name.localeCompare(b.name, 'ru'),
    );
  }

  async getCities(autoStatus: EventAutoStatus[] = []) {
    if (autoStatus.length > 0) {
      return this.citiesForWhere({
        status: 'PUBLISHED',
        autoStatus: { in: autoStatus },
      });
    }

    return this.prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, region: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getFacets(query: FacetQuery) {
    const commonWhere = this.commonFacetWhere(query);

    // City facet deliberately ignores the current city selection, but respects
    // status and all other groups. Multiple statuses are OR-ed by Prisma `in`.
    const cityWhere: Prisma.EventWhereInput = {
      ...commonWhere,
      ...(query.autoStatus?.length
        ? { autoStatus: { in: query.autoStatus } }
        : {}),
    };

    // Status facet deliberately ignores the current status selection, but
    // respects city and all other groups. This prevents self-filtering loops.
    const statusWhere: Prisma.EventWhereInput = {
      ...commonWhere,
      ...(query.cities?.length ? this.cityConstraint(query.cities) : {}),
    };

    const [cities, statusRows] = await Promise.all([
      this.citiesForWhere(cityWhere),
      this.prisma.event.findMany({
        where: statusWhere,
        select: { autoStatus: true },
        distinct: ['autoStatus'],
      }),
    ]);

    const statuses = statusRows.map((row) => row.autoStatus);
    return { cities, statuses };
  }
}
