import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type LegalDocTypeValue =
  | 'PRIVACY_POLICY'
  | 'USER_AGREEMENT'
  | 'PERSONAL_DATA_CONSENT'
  | 'COOKIE_POLICY'
  | 'BROADCAST_CONSENT';

export interface UpdateLegalDocDto {
  title?: string;
  content?: string;
}

export interface PublishLegalDocDto {
  content: string;
  publishedAt?: string;
  createdBy?: string;
}

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async findByType(type: LegalDocTypeValue) {
    const doc = await this.prisma.legalDoc.findUnique({ where: { type } });
    if (!doc) throw new NotFoundException(`Legal document not found: ${type}`);
    return doc;
  }

  async findAll() {
    return this.prisma.legalDoc.findMany({ orderBy: { type: 'asc' } });
  }

  async update(type: LegalDocTypeValue, dto: UpdateLegalDocDto) {
    await this.findByType(type);
    return this.prisma.legalDoc.update({ where: { type }, data: dto });
  }

  async publish(type: LegalDocTypeValue, dto: PublishLegalDocDto, adminId?: string) {
    const doc = await this.findByType(type);
    const publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();

    await this.prisma.legalDocVersion.create({
      data: {
        docId: doc.id,
        content: dto.content,
        publishedAt,
        createdBy: dto.createdBy ?? adminId ?? null,
      },
    });

    return this.prisma.legalDoc.update({
      where: { type },
      data: {
        content: dto.content,
        isDraft: false,
        publishedAt,
      },
    });
  }

  async getVersions(type: LegalDocTypeValue) {
    const doc = await this.findByType(type);
    return this.prisma.legalDocVersion.findMany({
      where: { docId: doc.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
