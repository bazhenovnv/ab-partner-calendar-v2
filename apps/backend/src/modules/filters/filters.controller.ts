import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FiltersService } from './filters.service';

@ApiTags('filters')
@Controller('filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'filters' };
  }
}
