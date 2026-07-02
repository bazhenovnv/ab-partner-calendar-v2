import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService, SETTINGS_KEYS } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class UpdateSettingDto {
  value!: unknown;
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
  updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    if (!(SETTINGS_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown or restricted setting key: ${key}`);
    }
    return this.adminService.updateSetting(key, dto.value);
  }
}
