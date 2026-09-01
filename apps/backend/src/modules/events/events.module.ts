import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventLifecycleService } from './event-lifecycle.service';
import { EventPublicationLocationService } from './event-publication-location.service';
import { MainEventsService } from './main-events.service';
import { MaxSourcePreviewService } from './max-source-preview.service';

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    EventLifecycleService,
    EventPublicationLocationService,
    MainEventsService,
    MaxSourcePreviewService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
