import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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

    const locationKey = (name: string, region: string) =>
      `${region.trim().toLocaleLowerCase('ru')}::${name.trim().toLocaleLowerCase('ru')}`;
    const citiesByLocation = new Map(
      catalogueCities.map((city) => [locationKey(city.name, city.region), city]),
    );

    for (const eventLocation of eventLocations) {
      if (eventLocation.city) {
        const relatedCity = eventLocation.city;
        const key = locationKey(relatedCity.name, relatedCity.region);
        if (!citiesByLocation.has(key)) citiesByLocation.set(key, relatedCity);
      }

      const name = eventLocation.cityName?.trim();
      const normalizedName = name?.toLocaleLowerCase('ru');

      if (!name || !normalizedName || normalizedName === 'онлайн') {
        continue;
      }

      const inferredRegion = name.split(',')[0]?.trim() || 'Другие регионы';
      const key = locationKey(name, inferredRegion);
      if (!citiesByLocation.has(key)) {
        citiesByLocation.set(key, {
          id: `event-city:${normalizedName}`,
          name,
          region: inferredRegion,
        });
      }
    }

    return Array.from(citiesByLocation.values()).sort((a, b) =>
      a.region.localeCompare(b.region, 'ru') || a.name.localeCompare(b.name, 'ru'),
    );
  }
}
