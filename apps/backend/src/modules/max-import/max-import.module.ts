import { Module } from '@nestjs/common';
import { MaxImportService } from './max-import.service';
import { MaxParserService } from './max-parser.service';
import { MaxImportController } from './max-import.controller';
import { MaxWebhookController } from './max-webhook.controller';

@Module({
  controllers: [MaxImportController, MaxWebhookController],
  providers: [MaxImportService, MaxParserService],
  exports: [MaxImportService, MaxParserService],
})
export class MaxImportModule {}
