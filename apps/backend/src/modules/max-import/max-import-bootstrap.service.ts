import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MaxImportService } from './max-import.service';

@Injectable()
export class MaxImportBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaxImportBootstrapService.name);

  constructor(
    private readonly maxImportService: MaxImportService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('MAX_IMPORT_ENABLED') !== 'true') {
      this.logger.warn('MAX startup reconciliation skipped: MAX_IMPORT_ENABLED is not true');
      return;
    }

    // Let Nest finish binding routes and database connections before the first reconciliation.
    setTimeout(() => {
      void this.runStartupReconciliation();
    }, 5_000);
  }

  private async runStartupReconciliation(): Promise<void> {
    try {
      this.logger.log('Starting MAX reconciliation after application startup');
      const { log } = await this.maxImportService.runManual();
      this.logger.log(
        `MAX startup reconciliation finished: found=${log.postsFound}, imported=${log.imported}, ` +
          `updated=${log.updated}, skipped=${log.skipped}, errors=${log.errors}`,
      );
    } catch (error) {
      this.logger.error(
        `MAX startup reconciliation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
