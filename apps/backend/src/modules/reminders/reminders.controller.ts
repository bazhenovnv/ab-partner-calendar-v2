import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'reminders' };
  }
}
