import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPlausibleCityName } from '@ab-afisha/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EventPublicationLocationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCanonicalPhysicalCity(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        format: true,
        cityId: true,
        cityName: true,
        city: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.format !== 'OFFLINE' && event.format !== 'HYBRID') return;

    const canonicalCity = event.city;
    const hasValidCanonicalCity = Boolean(
      event.cityId &&
      canonicalCity &&
      canonicalCity.isActive &&
      isPlausibleCityName(canonicalCity.name),
    );

    if (hasValidCanonicalCity && canonicalCity) {
      if (event.cityName?.trim() !== canonicalCity.name) {
        await this.prisma.event.update({
          where: { id: event.id },
          data: { cityName: canonicalCity.name },
        });
      }
      return;
    }

    // Legacy imported/edited events may contain a valid cityName but have no
    // canonical cityId. Auto-link only an unambiguous exact (case-insensitive)
    // match from the active city catalogue. Never use fuzzy matching here.
    const legacyCityName = event.cityName?.trim();
    if (legacyCityName && isPlausibleCityName(legacyCityName)) {
      const exactMatches = await this.prisma.city.findMany({
        where: {
          isActive: true,
          name: {
            equals: legacyCityName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
        take: 2,
      });

      if (exactMatches.length === 1) {
        const matchedCity = exactMatches[0];
        await this.prisma.event.update({
          where: { id: event.id },
          data: {
            cityId: matchedCity.id,
            cityName: matchedCity.name,
          },
        });
        return;
      }
    }

    throw new BadRequestException(
      'Для публикации офлайн/гибридного мероприятия выберите активный город из справочника городов.',
    );
  }
}
