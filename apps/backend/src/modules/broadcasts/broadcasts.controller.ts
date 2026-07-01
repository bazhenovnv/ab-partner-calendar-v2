import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  BroadcastsService,
  CreateBroadcastDto,
  UpdateBroadcastDto,
} from './broadcasts.service';

function parsePage(val: unknown, def: number): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) || n < 1 ? def : n;
}

function assertBotToken(header: string | undefined): void {
  const expected = process.env.BOT_INTERNAL_TOKEN;
  if (!expected) {
    new Logger('BroadcastsController').error('BOT_INTERNAL_TOKEN is not set');
    throw new ForbiddenException('Bot internal token not configured');
  }
  if (!header || header !== expected) {
    throw new ForbiddenException('Invalid bot internal token');
  }
}

@ApiTags('broadcasts')
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  // ── Admin: broadcast CRUD ─────────────────────────────────────────────────

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(@Query('page') page: unknown, @Query('limit') limit: unknown) {
    return this.broadcastsService.findAll(parsePage(page, 1), parsePage(limit, 20));
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.broadcastsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateBroadcastDto) {
    return this.broadcastsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateBroadcastDto) {
    return this.broadcastsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.broadcastsService.remove(id);
  }

  // ── Admin: lifecycle ──────────────────────────────────────────────────────

  @Post(':id/test-send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  testSend(@Param('id') id: string, @Query('adminChatId') adminChatId: string) {
    const chatId = adminChatId || process.env.ADMIN_TELEGRAM_CHAT_ID || '';
    return this.broadcastsService.testSend(id, chatId);
  }

  @Post(':id/schedule')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  schedule(@Param('id') id: string) {
    return this.broadcastsService.enqueue(id);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  cancel(@Param('id') id: string) {
    return this.broadcastsService.cancel(id);
  }

  // ── Admin: recipients & logs ──────────────────────────────────────────────

  @Get(':id/recipients')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getRecipients(
    @Param('id') id: string,
    @Query('page') page: unknown,
    @Query('limit') limit: unknown,
  ) {
    return this.broadcastsService.getRecipients(id, parsePage(page, 1), parsePage(limit, 50));
  }

  @Get(':id/logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getLogs(@Param('id') id: string, @Query('page') page: unknown, @Query('limit') limit: unknown) {
    return this.broadcastsService.getLogs(id, parsePage(page, 1), parsePage(limit, 100));
  }

  // ── Public (bot-authenticated): unsubscribe ───────────────────────────────

  @Post('unsubscribe')
  async unsubscribe(
    @Headers('x-bot-internal-token') token: string | undefined,
    @Body() dto: { channel: 'TELEGRAM' | 'MAX'; externalId: string },
  ) {
    assertBotToken(token);
    return this.broadcastsService.unsubscribe(dto.channel, dto.externalId);
  }
}
