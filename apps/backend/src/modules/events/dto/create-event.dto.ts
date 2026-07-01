import {
  IsString, IsOptional, IsBoolean, IsEnum,
  IsDateString, IsUrl, IsArray, IsUUID, MinLength,
} from 'class-validator';
import { EventFormat, PriceType } from '@ab-afisha/shared';

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsEnum(['ONLINE', 'OFFLINE'])
  format: EventFormat;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsUrl()
  eventUrl?: string;

  @IsOptional()
  @IsUrl()
  ticketUrl?: string;

  @IsOptional()
  @IsBoolean()
  ticketSalesEnabled?: boolean;

  @IsOptional()
  @IsString()
  speaker?: string;

  @IsEnum(['FREE', 'PAID'])
  priceType: PriceType;

  @IsOptional()
  @IsString()
  priceText?: string;

  @IsOptional()
  @IsBoolean()
  mainEvent?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  directionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
