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

  getCities() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, region: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
