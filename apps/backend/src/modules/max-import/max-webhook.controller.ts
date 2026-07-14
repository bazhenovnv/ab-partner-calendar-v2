import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiExcludeController } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MaxImportService } from './max-import.service';

/**
 * Public endpoint for MAX Bot API webhook deliveries.
 * No JWT guard — authentication is via X-Max-Bot-Api-Secret header.
 * Returns 200 immediately; processing is synchronous but safe to await.
 */
@ApiTags('max-webhook')
@ApiExcludeController()
@Controller('max-webhook')
export class MaxWebhookController {
  private readonly logger = new Logger(MaxWebhookController.name);

  constructor(
    private readonly maxImportService: MaxImportService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Headers('x-max-bot-api-secret') secret: string | undefined,
    @Body() body: unknown,
  ): Promise<{ ok: boolean }> {
    const expected = this.config.get<string>('MAX_WEBHOOK_SECRET');

    if (!expected) {
      this.logger.warn('MAX_WEBHOOK_SECRET not configured — rejecting webhook');
      throw new ForbiddenException('Webhook not configured');
    }

    if (!this.secretValid(expected, secret ?? '')) {
      this.logger.warn('Webhook: invalid X-Max-Bot-Api-Secret');
      throw new ForbiddenException('Invalid secret');
    }

    const enabled = this.config.get<string>('MAX_IMPORT_ENABLED') === 'true';
    if (!enabled) {
      this.logger.debug('MAX_IMPORT_ENABLED=false — webhook payload ignored');
      return { ok: true };
    }

    try {
      await this.maxImportService.processWebhookUpdate(body);
    } catch (err) {
      // Log but still return 200 so MAX does not keep retrying a broken payload
      this.logger.error(`Webhook processing error: ${err}`);
    }

    return { ok: true };
  }

  private secretValid(expected: string, actual: string): boolean {
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(actual);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
