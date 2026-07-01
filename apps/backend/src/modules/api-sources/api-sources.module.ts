import { Module } from '@nestjs/common';
import { ApiSourcesController } from './api-sources.controller';
import { ApiSourcesService } from './api-sources.service';

@Module({
  controllers: [ApiSourcesController],
  providers: [ApiSourcesService],
  exports: [ApiSourcesService],
})
export class ApiSourcesModule {}
