import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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
    const [catalogueCities, eventCities] = await Promise.all([
      this.prisma.city.findMany({
        where: { isActive: true },
        select: { id: true, name: true, region: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          cityName: { not: null },
        },
        select: { cityName: true },
        distinct: ['cityName'],
      }),
    ]);

    const citiesByName = new Map(
      catalogueCities.map((city) => [city.name.trim().toLocaleLowerCase('ru'), city]),
    );

    for (const eventCity of eventCities) {
      const name = eventCity.cityName?.trim();
      const normalizedName = name?.toLocaleLowerCase('ru');

      if (!name || !normalizedName || normalizedName === 'онлайн') {
        continue;
      }

      if (!citiesByName.has(normalizedName)) {
        citiesByName.set(normalizedName, {
          id: `event-city:${normalizedName}`,
          name,
          region: 'Города мероприятий',
        });
      }
    }

    return Array.from(citiesByName.values());
  }
}
