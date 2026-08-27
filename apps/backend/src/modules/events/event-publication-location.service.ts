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
    if (
      !event.cityId ||
      !canonicalCity ||
      !canonicalCity.isActive ||
      !isPlausibleCityName(canonicalCity.name)
    ) {
      throw new BadRequestException(
        'Для публикации офлайн/гибридного мероприятия выберите активный город из справочника городов.',
      );
    }

    if (event.cityName?.trim() !== canonicalCity.name) {
      await this.prisma.event.update({
        where: { id: event.id },
        data: { cityName: canonicalCity.name },
      });
    }
  }
}
