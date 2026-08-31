import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EditorialService } from './editorial.service';

@ApiTags('editorial')
@ApiBearerAuth()
@Controller('editorial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EditorialController {
  constructor(private readonly editorial: EditorialService) {}

  @Get('channels')
  channels() {
    return this.editorial.getChannels();
  }

  @Get('dashboard')
  dashboard(@Query('days') days?: string) {
    const parsed = Math.max(7, Math.min(90, Number(days) || 30));
    return this.editorial.getDashboard(parsed);
  }

  @Get('posts')
  posts(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.editorial.findAll(
      Math.max(1, Number(page) || 1),
      Math.max(1, Math.min(100, Number(limit) || 20)),
    );
  }

  @Get('posts/:id')
  post(@Param('id') id: string) {
    return this.editorial.findOne(id);
  }

  @Post('posts')
  create(@Body() body: Record<string, unknown>) {
    return this.editorial.create(body);
  }

  @Patch('posts/:id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.editorial.update(id, body);
  }

  @Post('posts/:id/publish')
  publish(
    @Param('id') id: string,
    @Body() body: { channelKeys?: string[] },
  ) {
    return this.editorial.publish(id, body.channelKeys);
  }

  @Post('posts/:id/retry')
  retry(
    @Param('id') id: string,
    @Body() body: { channelKeys?: string[] },
  ) {
    return this.editorial.retryFailed(id, body.channelKeys);
  }

  @Post('stats/sync')
  syncStats() {
    return this.editorial.syncStats();
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('template') template?: string,
  ) {
    return this.editorial.uploadImage(file, template || 'square');
  }
}
