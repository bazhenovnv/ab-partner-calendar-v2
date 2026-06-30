import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BuilderService } from './builder.service';

@ApiTags('builder')
@Controller('builder')
export class BuilderController {
  constructor(private readonly builderService: BuilderService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'builder' };
  }
}
