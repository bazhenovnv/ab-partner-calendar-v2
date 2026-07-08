import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  DirectionsService,
  CreateDirectionDto,
  UpdateDirectionDto,
  ListDirectionsQuery,
} from './directions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('directions')
@Controller('admin/directions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@ApiBearerAuth()
export class DirectionsController {
  constructor(private readonly directionsService: DirectionsService) {}

  @Get()
  list(@Query() query: ListDirectionsQuery) {
    return this.directionsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.directionsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateDirectionDto) {
    return this.directionsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDirectionDto) {
    return this.directionsService.update(id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.directionsService.toggle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.directionsService.remove(id);
  }
}
