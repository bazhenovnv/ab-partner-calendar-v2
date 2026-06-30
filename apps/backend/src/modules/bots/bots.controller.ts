import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BotsService } from './bots.service';

@ApiTags('bots')
@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'bots' };
  }
}
