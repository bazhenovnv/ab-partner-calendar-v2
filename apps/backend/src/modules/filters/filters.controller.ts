import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventAutoStatus } from '@prisma/client';
import { FiltersService } from './filters.service';

@ApiTags('filters')
@Controller('filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'filters' };
  }

  @Get('directions')
  getDirections() {
    return this.filtersService.getDirections();
  }

  @Get('cities')
  getCities(@Query('autoStatus') autoStatus?: string | string[]) {
    const requestedStatuses = Array.isArray(autoStatus)
      ? autoStatus
      : autoStatus
        ? [autoStatus]
        : [];
    const allowedStatuses = new Set(Object.values(EventAutoStatus));
    const statuses = requestedStatuses.filter(
      (status): status is EventAutoStatus => allowedStatuses.has(status as EventAutoStatus),
    );

    return this.filtersService.getCities(statuses);
  }
}
