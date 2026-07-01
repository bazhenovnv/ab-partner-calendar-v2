import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

@ApiTags('bots')
@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'bots' };
  }

  @Get('config')
  async getConfig() {
    const phoneRequired = await this.botsService.isPhoneRequired();
    return { phoneRequired };
  }

  @Post('users/upsert')
  async upsertUser(@Body() dto: UpsertBotUserDto) {
    return this.botsService.upsertBotUser({
      channel: dto.channel,
      externalId: dto.externalId,
      username: dto.username,
      firstName: dto.firstName,
    });
  }

  @Post('users/:id/accept-legal')
  async acceptLegal(@Param('id') id: string, @Body() dto: AcceptLegalDto) {
    await this.botsService.acceptLegal(id, dto.acceptBroadcastConsent ?? false);
    return { ok: true };
  }

  @Post('users/:id/phone')
  async savePhone(@Param('id') id: string, @Body() dto: SavePhoneDto) {
    await this.botsService.savePhone(id, dto.phone);
    return { ok: true };
  }
}
