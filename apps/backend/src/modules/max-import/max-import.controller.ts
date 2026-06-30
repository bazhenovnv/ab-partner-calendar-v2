import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaxImportService } from './max-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('max-import')
@Controller('max-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class MaxImportController {
  constructor(private readonly maxImportService: MaxImportService) {}

  @Post('run')
  runManualImport() {
    return this.maxImportService.runManual();
  }

  @Get('logs')
  getLogs() {
    return { message: 'Logs endpoint - implement with PrismaService' };
  }
}
