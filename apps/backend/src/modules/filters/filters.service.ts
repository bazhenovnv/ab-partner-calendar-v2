import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const NON_CITY_LOCATION_VALUES = new Set([
  'онлайн',
  'online',
  'очно',
  'офлайн',
  'offline',
  'дистанционно',
]);

const VENUE_MARKERS = [
  'центр',
  'отель',
  'гостиниц',
  'конференц',
  'офис',
  'зал',
  'площадк',
  'рбк',
  'адрес',
  'улиц',
  'ул.',
  'проспект',
  'дом ',
];

function normalizeLocationValue(value: string) {
  return value
    .trim()
    .replace(/^(?:г\.|город)\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru');
}

function splitLocationParts(value: string) {
  return value
    .split(/\s*(?:,|;|\||—|–)\s*|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function locationMatchesCity(location: string, cityName: string) {
  const normalizedCity = normalizeLocationValue(cityName);
  if (!normalizedCity) return false;

  const normalizedLocation = normalizeLocationValue(location);
  if (normalizedLocation === normalizedCity) return true;
  if (normalizedLocation.startsWith(`${normalizedCity} (`)) return true;

  return splitLocationParts(location).some(
    (part) => normalizeLocationValue(part) === normalizedCity,
  );
}

function isNonCityValue(value: string) {
  return NON_CITY_LOCATION_VALUES.has(normalizeLocationValue(value));
}

function looksLikeVenue(value: string) {
  const normalized = normalizeLocationValue(value);
  return VENUE_MARKERS.some((marker) => normalized.includes(marker));
}

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
      where: { isActive: true },
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
          ],
        },
        select: {
          cityName: true,
          city: {
            select: { id: true, name: true, region: true },
          },
        },
      }),
    ]);

    const catalogueBySpecificity = [...catalogueCities].sort(
      (a, b) => b.name.length - a.name.length,
    );
    const usedCities = new Map<string, UsedCity>();

    const addCity = (
      city: { id: string; name: string; region: string },
      filterValue: string,
    ) => {
      const name = city.name.trim();
      const normalizedName = normalizeLocationValue(name);
      const normalizedFilterValue = filterValue.trim();

      if (!name || !normalizedName || isNonCityValue(name)) return;

      const existing = usedCities.get(normalizedName);
      if (existing) {
        existing.filterValues.add(name);
        if (normalizedFilterValue) existing.filterValues.add(normalizedFilterValue);
        return;
      }

      usedCities.set(normalizedName, {
        id: city.id,
        name,
        region: city.region.trim() || 'Другие регионы',
        filterValues: new Set(
          [name, normalizedFilterValue].filter((value): value is string => Boolean(value)),
        ),
      });
    };

    for (const eventLocation of eventLocations) {
      const rawLocation = eventLocation.cityName?.trim() ?? '';

      if (eventLocation.city) {
        addCity(eventLocation.city, rawLocation || eventLocation.city.name);
        continue;
      }

      if (!rawLocation || isNonCityValue(rawLocation)) continue;

      const matchedCity = catalogueBySpecificity.find((city) =>
        locationMatchesCity(rawLocation, city.name),
      );

      if (matchedCity) {
        addCity(matchedCity, rawLocation);
        continue;
      }

      const parts = splitLocationParts(rawLocation);
      if (parts.length !== 1 || looksLikeVenue(parts[0])) continue;

      const fallbackName = parts[0]
        .replace(/^(?:г\.|город)\s*/i, '')
        .trim();
      const normalizedFallback = normalizeLocationValue(fallbackName);

      if (!fallbackName || !normalizedFallback || isNonCityValue(fallbackName)) continue;

      addCity(
        {
          id: `event-city:${normalizedFallback}`,
          name: fallbackName,
          region: 'Другие регионы',
        },
        rawLocation,
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
