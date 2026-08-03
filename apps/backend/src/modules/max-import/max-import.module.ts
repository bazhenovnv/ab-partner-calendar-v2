import { Module } from '@nestjs/common';
import { MaxImportService } from './max-import.service';
import { MaxParserService } from './max-parser.service';
import { MaxImportController } from './max-import.controller';
import { MaxWebhookController } from './max-webhook.controller';
import { MaxImportBootstrapService } from './max-import-bootstrap.service';
import { MaxBotInteractionService } from './max-bot-interaction.service';
import { BotsModule } from '../bots/bots.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [BotsModule, RemindersModule],
  controllers: [MaxImportController, MaxWebhookController],
  providers: [
    MaxImportService,
    MaxParserService,
    MaxImportBootstrapService,
    MaxBotInteractionService,
  ],
  exports: [MaxImportService, MaxParserService],
})
export class MaxImportModule {}
