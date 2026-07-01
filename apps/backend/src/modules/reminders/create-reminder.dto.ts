import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReminderDto {
  @ApiProperty({ description: 'Event ID to remind about' })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ description: 'Bot user ID (external user identifier)' })
  @IsString()
  @IsNotEmpty()
  botUserId!: string;

  @ApiProperty({
    description: 'Reminder datetime in ISO 8601 format (user-chosen, stored as UTC)',
    example: '2025-07-15T06:00:00.000Z',
  })
  @IsDateString()
  remindAt!: string;

  @ApiPropertyOptional({
    description: 'IANA timezone name for display purposes',
    default: 'Europe/Moscow',
    example: 'Europe/Moscow',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
