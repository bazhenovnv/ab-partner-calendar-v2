import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'analytics' };
  }

  @Post('visit')
  trackVisit(@Body() body: { page?: string; sessionId?: string | null }) {
    return this.analyticsService.trackVisit(body.page ?? '/', body.sessionId);
  }

  @Post('events/:eventId')
  trackEvent(
    @Body() body: { eventId?: string; action?: string; sessionId?: string | null },
  ) {
    const eventId = body.eventId ?? '';
    return this.analyticsService.trackEvent(eventId, body.action ?? 'view', body.sessionId);
  }

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  getAdminOverview() {
    return this.analyticsService.getAdminOverview();
  }
}
