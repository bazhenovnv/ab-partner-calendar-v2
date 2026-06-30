import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('public')
  getPublicEvents(@Query() query: EventsQueryDto) {
    return this.eventsService.getPublicEvents(query);
  }

  @Get('public/calendar')
  getCalendarMarkers(@Query() query: CalendarQueryDto) {
    return this.eventsService.getCalendarMarkers(query);
  }

  @Get('public/main')
  getMainEvents() {
    return this.eventsService.getMainEvents();
  }

  @Get('public/:id')
  getPublicEventById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getPublicEventById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('admin')
  @Roles('ADMIN', 'EDITOR')
  getAdminEvents(@Query() query: EventsQueryDto) {
    return this.eventsService.getAdminEvents(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('admin/needs-attention')
  @Roles('ADMIN', 'EDITOR')
  getNeedsAttention() {
    return this.eventsService.getNeedsAttention();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('admin/:id')
  @Roles('ADMIN', 'EDITOR')
  getAdminEventById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getAdminEventById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('admin')
  @Roles('ADMIN', 'EDITOR')
  createEvent(@Body() dto: CreateEventDto, @Request() req: any) {
    return this.eventsService.createEvent(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Put('admin/:id')
  @Roles('ADMIN', 'EDITOR')
  updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @Request() req: any,
  ) {
    return this.eventsService.updateEvent(id, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Patch('admin/:id/status')
  @Roles('ADMIN', 'EDITOR')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.eventsService.setManualStatus(id, status as any, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Patch('admin/:id/publish')
  @Roles('ADMIN', 'EDITOR')
  publishEvent(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.eventsService.publishEvent(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Patch('admin/:id/archive')
  @Roles('ADMIN', 'EDITOR')
  archiveEvent(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.eventsService.archiveEvent(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Delete('admin/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvent(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.eventsService.deleteEvent(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('admin/:id/versions')
  @Roles('ADMIN', 'EDITOR')
  getVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getVersions(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('admin/:id/versions/:versionId/restore')
  @Roles('ADMIN', 'EDITOR')
  restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Request() req: any,
  ) {
    return this.eventsService.restoreVersion(id, versionId, req.user.id);
  }
}
