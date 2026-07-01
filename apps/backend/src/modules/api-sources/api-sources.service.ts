import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ApiSourcesService {
  constructor(private readonly prisma: PrismaService) {}
}
