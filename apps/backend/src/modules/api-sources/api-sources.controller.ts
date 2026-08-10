import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiSourceInput, ApiSourcesService } from './api-sources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class ApiSourceDto {
  @IsString()
  name!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  headers?: unknown;

  @IsOptional()
  @IsString()
  authType?: string;

  @IsOptional()
  authConfig?: unknown;

  @IsOptional()
  @IsInt()
  @Min(1)
  syncPeriod?: number;

  @IsOptional()
  fieldMapping?: unknown;

  @IsOptional()
  @IsString()
  syncMode?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

@ApiTags('api-sources')
@Controller('api-sources')
export class ApiSourcesController {
  constructor(private readonly apiSourcesService: ApiSourcesService) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'api-sources' };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  list() {
    return this.apiSourcesService.list();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  get(@Param('id') id: string) {
    return this.apiSourcesService.get(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  create(@Body() dto: ApiSourceDto) {
    return this.apiSourcesService.create(dto as ApiSourceInput);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<ApiSourceDto>) {
    return this.apiSourcesService.update(id, dto as Partial<ApiSourceInput>);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.apiSourcesService.remove(id);
  }

  @Post('admin/:id/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  test(@Param('id') id: string) {
    return this.apiSourcesService.test(id);
  }
}
