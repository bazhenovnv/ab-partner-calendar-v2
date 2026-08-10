import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ApiSourceInput {
  name: string;
  url: string;
  method?: string;
  headers?: unknown;
  authType?: string;
  authConfig?: unknown;
  syncPeriod?: number;
  fieldMapping?: unknown;
  syncMode?: string;
  isEnabled?: boolean;
}

@Injectable()
export class ApiSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.apiSource.findMany({
      orderBy: [{ isEnabled: 'desc' }, { name: 'asc' }],
      include: { logs: { orderBy: { runAt: 'desc' }, take: 5 } },
    });
  }

  async get(id: string) {
    const source = await this.prisma.apiSource.findUnique({
      where: { id },
      include: { logs: { orderBy: { runAt: 'desc' }, take: 50 } },
    });
    if (!source) throw new NotFoundException('API source not found');
    return source;
  }

  create(input: ApiSourceInput) {
    const data: Prisma.ApiSourceCreateInput = {
      name: input.name.trim(),
      url: input.url.trim(),
      method: input.method?.trim().toUpperCase() || 'GET',
      headers: (input.headers ?? {}) as Prisma.InputJsonValue,
      authType: input.authType ?? 'none',
      authConfig: (input.authConfig ?? {}) as Prisma.InputJsonValue,
      syncPeriod: input.syncPeriod ?? 60,
      fieldMapping: (input.fieldMapping ?? {}) as Prisma.InputJsonValue,
      syncMode: input.syncMode ?? 'new_and_update',
      isEnabled: input.isEnabled ?? false,
    };
    return this.prisma.apiSource.create({ data });
  }

  async update(id: string, input: Partial<ApiSourceInput>) {
    await this.get(id);
    return this.prisma.apiSource.update({
      where: { id },
      data: this.toUpdateData(input),
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.apiSourceLog.deleteMany({ where: { sourceId: id } });
    await this.prisma.apiSource.delete({ where: { id } });
    return { success: true };
  }

  async test(id: string) {
    const source = await this.get(id);
    const startedAt = Date.now();
    try {
      const response = await fetch(source.url, {
        method: source.method || 'GET',
        headers: (source.headers ?? {}) as Record<string, string>,
        signal: AbortSignal.timeout(15_000),
      });
      const success = response.ok;
      const detail = success ? null : `HTTP ${response.status} ${response.statusText}`;
      await this.prisma.apiSourceLog.create({
        data: {
          sourceId: id,
          success,
          errors: success ? 0 : 1,
          errorDetail: detail,
        },
      });
      return {
        success,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        error: detail,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.apiSourceLog.create({
        data: { sourceId: id, success: false, errors: 1, errorDetail: message },
      });
      return { success: false, durationMs: Date.now() - startedAt, error: message };
    }
  }

  private toUpdateData(input: Partial<ApiSourceInput>): Prisma.ApiSourceUpdateInput {
    return {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.url !== undefined && { url: input.url.trim() }),
      ...(input.method !== undefined && { method: input.method.trim().toUpperCase() }),
      ...(input.headers !== undefined && { headers: input.headers as Prisma.InputJsonValue }),
      ...(input.authType !== undefined && { authType: input.authType }),
      ...(input.authConfig !== undefined && { authConfig: input.authConfig as Prisma.InputJsonValue }),
      ...(input.syncPeriod !== undefined && { syncPeriod: input.syncPeriod }),
      ...(input.fieldMapping !== undefined && { fieldMapping: input.fieldMapping as Prisma.InputJsonValue }),
      ...(input.syncMode !== undefined && { syncMode: input.syncMode }),
      ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
    };
  }
}
