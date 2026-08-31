import { Module } from '@nestjs/common';
import { EditorialController } from './editorial.controller';
import { EditorialService } from './editorial.service';
import { EditorialMaxDiscoveryService } from './editorial-max-discovery.service';

@Module({
  controllers: [EditorialController],
  providers: [EditorialService, EditorialMaxDiscoveryService],
  exports: [EditorialService, EditorialMaxDiscoveryService],
})
export class EditorialModule {}
