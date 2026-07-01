import { IsOptional, IsString, IsDateString, IsArray, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class EventsQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  directions?: string[];

  @IsOptional()
  @IsEnum(['ONLINE', 'OFFLINE'])
  format?: 'ONLINE' | 'OFFLINE';

  @IsOptional()
  @IsEnum(['PLANNED', 'LIVE', 'COMPLETED'])
  autoStatus?: 'PLANNED' | 'LIVE' | 'COMPLETED';

  @IsOptional()
  @IsEnum(['FREE', 'PAID'])
  priceType?: 'FREE' | 'PAID';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 6;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
