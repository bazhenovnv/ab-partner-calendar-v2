import { Body, Controller, ForbiddenException, Get, Headers, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReminderDto } from './create-reminder.dto';
import { RemindersService } from './reminders.service';

const logger = new Logger('RemindersController');

function assertBotToken(header: string | undefined): void {
  const expected = process.env.BOT_INTERNAL_TOKEN;
  if (!expected) {
    logger.error('BOT_INTERNAL_TOKEN is not set — internal bot writes are blocked');
    throw new ForbiddenException('Bot internal token not configured');
  }
  if (!header || header !== expected) {
    throw new ForbiddenException('Invalid bot internal token');
  }
}

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
  create(
    @Headers('x-bot-internal-token') token: string | undefined,
    @Body() dto: CreateReminderDto,
  ) {
    assertBotToken(token);
    return this.remindersService.create(dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending reminder' })
  cancel(
    @Headers('x-bot-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    assertBotToken(token);
    return this.remindersService.cancel(id);
  }
}
