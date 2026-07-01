import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LegalService, LegalDocTypeValue, UpdateLegalDocDto, PublishLegalDocDto } from './legal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const VALID_TYPES: LegalDocTypeValue[] = [
  'PRIVACY_POLICY',
  'USER_AGREEMENT',
  'PERSONAL_DATA_CONSENT',
  'COOKIE_POLICY',
  'BROADCAST_CONSENT',
];

function assertValidType(type: string): asserts type is LegalDocTypeValue {
  if (!VALID_TYPES.includes(type as LegalDocTypeValue)) {
    throw new Error(`Invalid legal doc type: ${type}`);
  }
}

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  /** Public: get all published legal documents (title + type, no full content) */
  @Get()
  findAll() {
    return this.legalService.findAll();
  }

  /** Public: get single legal document by type slug */
  @Get(':type')
  findOne(@Param('type') type: string) {
    assertValidType(type);
    return this.legalService.findByType(type);
  }

  /** Admin: update title/content (saves as draft) */
  @Patch('admin/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  update(@Param('type') type: string, @Body() dto: UpdateLegalDocDto) {
    assertValidType(type);
    return this.legalService.update(type, dto);
  }

  /** Admin: publish a new version */
  @Post('admin/:type/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  publish(@Param('type') type: string, @Body() dto: PublishLegalDocDto, @Request() req: { user?: { id?: string } }) {
    assertValidType(type);
    return this.legalService.publish(type, dto, req.user?.id);
  }

  /** Admin: list version history */
  @Get('admin/:type/versions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  versions(@Param('type') type: string) {
    assertValidType(type);
    return this.legalService.getVersions(type);
  }
}
