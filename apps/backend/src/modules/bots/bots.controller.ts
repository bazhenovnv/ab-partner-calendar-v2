import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BotsService } from './bots.service';

class UpsertBotUserDto {
  channel!: 'TELEGRAM' | 'MAX';
  externalId!: string;
  username?: string;
  firstName?: string;
}

class AcceptLegalDto {
  acceptBroadcastConsent!: boolean;
}

class SavePhoneDto {
  phone!: string;
}

const logger = new Logger('BotsController');

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

@ApiTags('bots')
@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'bots' };
  }

  /** Public — no sensitive data, phoneRequired flag only */
  @Get('config')
  async getConfig() {
    const phoneRequired = await this.botsService.isPhoneRequired();
    return { phoneRequired };
  }

  @Post('users/upsert')
  async upsertUser(
    @Headers('x-bot-internal-token') token: string | undefined,
    @Body() dto: UpsertBotUserDto,
  ) {
    assertBotToken(token);
    return this.botsService.upsertBotUser({
      channel: dto.channel,
      externalId: dto.externalId,
      username: dto.username,
      firstName: dto.firstName,
    });
  }

  @Post('users/:id/accept-legal')
  async acceptLegal(
    @Headers('x-bot-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: AcceptLegalDto,
  ) {
    assertBotToken(token);
    await this.botsService.acceptLegal(id, dto.acceptBroadcastConsent ?? false);
    return { ok: true };
  }

  @Post('users/:id/phone')
  async savePhone(
    @Headers('x-bot-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: SavePhoneDto,
  ) {
    assertBotToken(token);
    await this.botsService.savePhone(id, dto.phone);
    return { ok: true };
  }
}
