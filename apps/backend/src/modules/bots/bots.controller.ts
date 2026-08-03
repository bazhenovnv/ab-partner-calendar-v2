import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BotsService } from './bots.service';

class UpsertBotUserDto {
  @IsIn(['TELEGRAM', 'MAX'])
  channel!: 'TELEGRAM' | 'MAX';

  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;
}

class AcceptLegalDto {
  @IsBoolean()
  acceptBroadcastConsent!: boolean;
}

class SavePhoneDto {
  @IsString()
  @IsNotEmpty()
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

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

  @Get('contacts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listContacts(
    @Query('page') page: unknown,
    @Query('limit') limit: unknown,
  ) {
    return this.botsService.findAcceptedContacts(
      positiveInteger(page, 1),
      positiveInteger(limit, 50),
    );
  }

  @Get('contacts/export')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ab-afisha-bot-contacts.csv"')
  exportContacts() {
    return this.botsService.exportAcceptedContactsCsv();
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
