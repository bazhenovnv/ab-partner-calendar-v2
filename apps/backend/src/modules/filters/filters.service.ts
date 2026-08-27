import { Injectable } from '@nestjs/common';
import { EventAutoStatus, Prisma } from '@prisma/client';
import {
  extractCityFromEventLocation,
  extractRegionFromEventLocation,
  isPlausibleCityName,
  normalizeLocationValue,
} from '@ab-afisha/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface FacetQuery {
  cities?: string[];
  directions?: string[];
  format?: 'ONLINE' | 'OFFLINE';
  priceType?: 'FREE' | 'PAID';
  autoStatus?: EventAutoStatus[];
}

interface PublicCityOption {
  id: string;
  name: string;
  region: string;
  filterValues: Set<string>;
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
        { city: { name: { equals: city, mode: 'insensitive' } } },
        { cityName: { equals: city, mode: 'insensitive' } },
      );
    }
    return locationFilters.length > 0 ? { OR: locationFilters } : {};
  }

  private async citiesForWhere(where: Prisma.EventWhereInput) {
    const [catalogueCities, eventLocations] = await Promise.all([
      this.prisma.city.findMany({
        select: { id: true, name: true, region: true, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.event.findMany({
        where: {
          ...where,
          OR: [
            { cityId: { not: null } },
            { cityName: { not: null } },
          ],
        },
        select: {
          cityName: true,
          address: true,
          venue: true,
          city: {
            select: { id: true, name: true, region: true, isActive: true },
          },
        },
      }),
    ]);

    const cleanCatalogue = catalogueCities.filter((city) =>
      city.isActive && isPlausibleCityName(city.name),
    );
    const inactiveCityNames = new Set(
      catalogueCities
        .filter((city) => !city.isActive && isPlausibleCityName(city.name))
        .map((city) => normalizeLocationValue(city.name)),
    );
    const directEventCityNames = eventLocations
      .flatMap((location) => [
        location.city?.isActive ? location.city.name : null,
        location.city && !location.city.isActive ? null : location.cityName,
      ])
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim().replace(/^(?:г\.|город)\s*/i, '').trim())
      .filter(isPlausibleCityName)
      .filter((name) => !inactiveCityNames.has(normalizeLocationValue(name)));
    const candidateNames = Array.from(
      new Map(
        [...cleanCatalogue.map((city) => city.name), ...directEventCityNames]
          .map((name) => [normalizeLocationValue(name), name]),
      ).values(),
    );
    const catalogueByName = new Map(
      cleanCatalogue.map((city) => [normalizeLocationValue(city.name), city]),
    );
    const citiesByName = new Map<string, PublicCityOption>();

    for (const eventLocation of eventLocations) {
      const linkedCity = eventLocation.city;
      if (linkedCity && !linkedCity.isActive) continue;

      const linkedCityIsValid = Boolean(
        linkedCity?.isActive && linkedCity.name && isPlausibleCityName(linkedCity.name),
      );
      const extractedName = linkedCityIsValid
        ? linkedCity!.name
        : extractCityFromEventLocation(
            {
              cityName: eventLocation.cityName,
              address: eventLocation.address,
              venue: eventLocation.venue,
            },
            candidateNames,
          );

      if (!extractedName || !isPlausibleCityName(extractedName)) continue;

      const normalizedName = normalizeLocationValue(extractedName);
      if (inactiveCityNames.has(normalizedName)) continue;

      const catalogueCity = catalogueByName.get(normalizedName);
      const matchingLinkedCity = linkedCityIsValid &&
        normalizeLocationValue(linkedCity!.name) === normalizedName
        ? linkedCity
        : null;
      const region =
        matchingLinkedCity?.region?.trim() ||
        catalogueCity?.region?.trim() ||
        extractRegionFromEventLocation({
          cityName: eventLocation.cityName,
          address: eventLocation.address,
          venue: eventLocation.venue,
        }) ||
        'Другие регионы';
      const canonicalName = catalogueCity?.name ?? matchingLinkedCity?.name ?? extractedName;
      const aliases = [canonicalName, eventLocation.cityName]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim());
      const existing = citiesByName.get(normalizedName);

      if (existing) {
        aliases.forEach((value) => existing.filterValues.add(value));
        continue;
      }

      citiesByName.set(normalizedName, {
        id: matchingLinkedCity?.id ?? catalogueCity?.id ?? `event-city:${normalizedName}`,
        name: canonicalName,
        region,
        filterValues: new Set(aliases),
      });
    }

    return Array.from(citiesByName.values())
      .map((city) => ({
        id: city.id,
        name: city.name,
        region: city.region,
        filterValues: Array.from(city.filterValues).sort((a, b) => {
          if (a === city.name) return -1;
          if (b === city.name) return 1;
          return a.localeCompare(b, 'ru');
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  async getCities(autoStatus: EventAutoStatus[] = []) {
    return this.citiesForWhere({
      status: 'PUBLISHED',
      ...(autoStatus.length > 0 ? { autoStatus: { in: autoStatus } } : {}),
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
    // respects the exact city aliases sent by the frontend and all other groups.
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
