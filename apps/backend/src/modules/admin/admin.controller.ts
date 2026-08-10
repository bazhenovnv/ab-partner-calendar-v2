import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { AdminService, SETTINGS_KEYS } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class UpdateSettingDto {
  value!: unknown;
}

class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(['ADMIN', 'EDITOR'])
  role!: UserRole;

  @IsString()
  @MinLength(12)
  password!: string;
}

class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'EDITOR'])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(12)
  password!: string;
}

function positiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'admin' };
  }

  /** Public: site status for middleware (no auth) */
  @Get('site-status')
  getSiteStatus() {
    return this.adminService.getSiteStatus();
  }

  /** Admin/Editor: dashboard aggregated stats */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  getDashboard() {
    return this.adminService.getDashboard();
  }

  /** Admin: get all exposed SiteConfig settings */
  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  getSettings() {
    return this.adminService.getSettings();
  }

  /** Admin: update a single SiteConfig key */
  @Patch('settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    if (!(SETTINGS_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown or restricted setting key: ${key}`);
    }
    return this.adminService.updateSetting(key, dto.value);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @Request() req: any,
  ) {
    return this.adminService.updateUser(id, dto, req.user.id);
  }

  @Post('users/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Request() req: any,
  ) {
    return this.adminService.resetUserPassword(id, dto.password, req.user.id);
  }

  @Get('main-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  getMainEvents() {
    return this.adminService.getMainEventsAdmin();
  }

  @Get('archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  getArchive(@Query('page') page: unknown, @Query('limit') limit: unknown) {
    return this.adminService.getArchive(
      positiveInt(page, 1),
      positiveInt(limit, 50),
    );
  }

  @Get('bots-reminders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  getBotsAndReminders() {
    return this.adminService.getBotsAndReminders();
  }

  @Get('site-builder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  getSiteBuilder() {
    return this.adminService.getSiteBuilder();
  }

  @Get('action-log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  getActionLog(@Query('page') page: unknown, @Query('limit') limit: unknown) {
    return this.adminService.getActionLogs(
      positiveInt(page, 1),
      positiveInt(limit, 100),
    );
  }

  @Get('error-log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  getErrorLog(@Query('page') page: unknown, @Query('limit') limit: unknown) {
    return this.adminService.getErrorLogs(
      positiveInt(page, 1),
      positiveInt(limit, 100),
    );
  }
}
