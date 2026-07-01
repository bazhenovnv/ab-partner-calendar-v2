import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { ImagesModule } from './modules/images/images.module';
import { CitiesModule } from './modules/cities/cities.module';
import { FiltersModule } from './modules/filters/filters.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { MaxImportModule } from './modules/max-import/max-import.module';
import { ApiSourcesModule } from './modules/api-sources/api-sources.module';
import { BotsModule } from './modules/bots/bots.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BuilderModule } from './modules/builder/builder.module';
import { LegalModule } from './modules/legal/legal.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: 60000, limit: config.get<number>('THROTTLE_LIMIT', 100) },
      ],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'redis'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    EventsModule,
    ImagesModule,
    CitiesModule,
    FiltersModule,
    QuotesModule,
    MaxImportModule,
    ApiSourcesModule,
    BotsModule,
    RemindersModule,
    AdminModule,
    AnalyticsModule,
    BuilderModule,
    LegalModule,
    BroadcastsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
