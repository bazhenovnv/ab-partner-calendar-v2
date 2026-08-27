import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventLifecycleService } from './event-lifecycle.service';
import { EventPublicationLocationService } from './event-publication-location.service';

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    EventLifecycleService,
    EventPublicationLocationService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
