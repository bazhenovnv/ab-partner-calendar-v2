import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CalendarQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2099)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  directions?: string[];

  @IsOptional()
  @IsEnum(['ONLINE', 'OFFLINE'])
  format?: 'ONLINE' | 'OFFLINE';

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(['PLANNED', 'LIVE', 'COMPLETED'], { each: true })
  autoStatus?: Array<'PLANNED' | 'LIVE' | 'COMPLETED'>;

  @IsOptional()
  @IsEnum(['FREE', 'PAID'])
  priceType?: 'FREE' | 'PAID';
}
