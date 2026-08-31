import { Module } from '@nestjs/common';
import { EditorialController } from './editorial.controller';
import { EditorialImageService } from './editorial-image.service';
import { EditorialMaxDiscoveryService } from './editorial-max-discovery.service';
import { EditorialSchedulerService } from './editorial-scheduler.service';
import { EditorialService } from './editorial.service';

@Module({
  controllers: [EditorialController],
  providers: [
    EditorialService,
    EditorialMaxDiscoveryService,
    EditorialImageService,
    EditorialSchedulerService,
  ],
  exports: [EditorialService, EditorialMaxDiscoveryService],
})
export class EditorialModule {}
