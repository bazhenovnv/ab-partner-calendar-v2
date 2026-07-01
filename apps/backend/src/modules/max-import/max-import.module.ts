import { Module } from '@nestjs/common';
import { MaxImportService } from './max-import.service';
import { MaxParserService } from './max-parser.service';
import { MaxImportController } from './max-import.controller';

@Module({
  controllers: [MaxImportController],
  providers: [MaxImportService, MaxParserService],
  exports: [MaxImportService, MaxParserService],
})
export class MaxImportModule {}
