import { Injectable } from '@nestjs/common';
import {
  extractCityFromEventLocation,
  isPlausibleCityName,
  normalizeLocationValue,
} from '@ab-afisha/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

interface UsedCity {
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

  async getCities() {
    const [catalogueCities, eventLocations] = await Promise.all([
      this.prisma.city.findMany({
        where: { isActive: true },
        select: { id: true, name: true, region: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { cityId: { not: null } },
            { cityName: { not: null } },
            { address: { not: null } },
            { venue: { not: null } },
          ],
        },
        select: {
          cityName: true,
          address: true,
          venue: true,
          city: {
            select: { id: true, name: true, region: true },
          },
        },
      }),
    ]);

    const cleanCatalogue = catalogueCities.filter((city) =>
      isPlausibleCityName(city.name),
    );
    const catalogueNames = cleanCatalogue.map((city) => city.name);
    const catalogueByName = new Map(
      cleanCatalogue.map((city) => [normalizeLocationValue(city.name), city]),
    );
    const usedCities = new Map<string, UsedCity>();

    const addCity = (
      city: { id: string; name: string; region: string },
      rawValues: Array<string | null | undefined>,
    ) => {
      const name = city.name.trim().replace(/^(?:г\.|город)\s*/i, '').trim();
      if (!isPlausibleCityName(name)) return;

      const key = normalizeLocationValue(name);
      const values = [name, ...rawValues]
        .map((value) => value?.trim() ?? '')
        .filter(Boolean);
      const existing = usedCities.get(key);

      if (existing) {
        values.forEach((value) => existing.filterValues.add(value));
        return;
      }

      usedCities.set(key, {
        id: city.id,
        name,
        region: city.region.trim() || 'Другие регионы',
        filterValues: new Set(values),
      });
    };

    for (const eventLocation of eventLocations) {
      const rawValues = [
        eventLocation.cityName,
        eventLocation.address,
        eventLocation.venue,
      ];

      if (
        eventLocation.city?.name &&
        isPlausibleCityName(eventLocation.city.name)
      ) {
        addCity(eventLocation.city, rawValues);
        continue;
      }

      const extractedName = extractCityFromEventLocation(
        {
          cityName: eventLocation.cityName,
          address: eventLocation.address,
          venue: eventLocation.venue,
        },
        catalogueNames,
      );
      if (!extractedName) continue;

      const catalogueCity = catalogueByName.get(
        normalizeLocationValue(extractedName),
      );
      addCity(
        catalogueCity ?? {
          id: `event-city:${normalizeLocationValue(extractedName)}`,
          name: extractedName,
          region: 'Другие регионы',
        },
        rawValues,
      );
    }

    return Array.from(usedCities.values())
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
}
