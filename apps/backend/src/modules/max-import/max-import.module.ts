import { Module } from '@nestjs/common';
import { MaxImportService } from './max-import.service';
import { MaxReliableImportService } from './max-reliable-import.service';
import { MaxParserService } from './max-parser.service';
import { MaxImportController } from './max-import.controller';
import { MaxWebhookController } from './max-webhook.controller';
import { MaxImportBootstrapService } from './max-import-bootstrap.service';
import { MaxImportRecoveryService } from './max-import-recovery.service';
import { MaxBotInteractionService } from './max-bot-interaction.service';
import { MaxSourcePostLinkService } from './max-source-post-link.service';
import { BotsModule } from '../bots/bots.module';
import { RemindersModule } from '../reminders/reminders.module';
import { EditorialModule } from '../editorial/editorial.module';

@Module({
  imports: [BotsModule, RemindersModule, EditorialModule],
  controllers: [MaxImportController, MaxWebhookController],
  providers: [
    MaxParserService,
    MaxReliableImportService,
    {
      provide: MaxImportService,
      useExisting: MaxReliableImportService,
    },
    MaxImportRecoveryService,
    MaxImportBootstrapService,
    MaxBotInteractionService,
    MaxSourcePostLinkService,
  ],
  exports: [
    MaxImportService,
    MaxReliableImportService,
    MaxParserService,
    MaxImportRecoveryService,
    MaxSourcePostLinkService,
  ],
})
export class MaxImportModule {}
