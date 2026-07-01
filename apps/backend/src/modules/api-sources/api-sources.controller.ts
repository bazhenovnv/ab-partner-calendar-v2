import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiSourcesService } from './api-sources.service';

@ApiTags('api-sources')
@Controller('api-sources')
export class ApiSourcesController {
  constructor(private readonly apiSourcesService: ApiSourcesService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'api-sources' };
  }
}
