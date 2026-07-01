import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService, BROADCAST_QUEUE } from './broadcasts.service';
import { BroadcastProcessor } from './broadcast.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: BROADCAST_QUEUE }),
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastProcessor],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
