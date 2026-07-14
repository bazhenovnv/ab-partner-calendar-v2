import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaxImportService } from './max-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('max-import')
@Controller('max-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class MaxImportController {
  constructor(
    private readonly maxImportService: MaxImportService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('run')
  runManualImport() {
    return this.maxImportService.runManual();
  }

  @Get('logs')
  async getLogs() {
    return this.prisma.maxImportLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 50,
    });
  }
}
