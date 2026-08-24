import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventLifecycleService } from './event-lifecycle.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventLifecycleService],
  exports: [EventsService],
})
export class EventsModule {}
