import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReminderDto } from './create-reminder.dto';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'reminders' };
  }

  @Post()
  @ApiOperation({ summary: 'Create a reminder for an event (free date/time, MSK)' })
  create(@Body() dto: CreateReminderDto) {
    return this.remindersService.create(dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending reminder' })
  cancel(@Param('id') id: string) {
    return this.remindersService.cancel(id);
  }
}
