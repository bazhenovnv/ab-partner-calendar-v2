import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventAutoStatus } from '@prisma/client';
import { FiltersService } from './filters.service';

@ApiTags('filters')
@Controller('filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  private toArray(value?: string | string[]) {
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  private statuses(value?: string | string[]) {
    const allowedStatuses = new Set(Object.values(EventAutoStatus));
    return this.toArray(value).filter(
      (status): status is EventAutoStatus => allowedStatuses.has(status as EventAutoStatus),
    );
  }

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
    return this.filtersService.getCities(this.statuses(autoStatus));
  }

  @Get('facets')
  getFacets(
    @Query('cities') cities?: string | string[],
    @Query('directions') directions?: string | string[],
    @Query('format') format?: string,
    @Query('priceType') priceType?: string,
    @Query('autoStatus') autoStatus?: string | string[],
  ) {
    return this.filtersService.getFacets({
      cities: this.toArray(cities),
      directions: this.toArray(directions),
      format: format === 'ONLINE' || format === 'OFFLINE' ? format : undefined,
      priceType: priceType === 'FREE' || priceType === 'PAID' ? priceType : undefined,
      autoStatus: this.statuses(autoStatus),
    });
  }
}
