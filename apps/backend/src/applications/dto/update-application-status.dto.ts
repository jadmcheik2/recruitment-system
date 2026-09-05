import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.SCREENING,
    description: 'Target pipeline stage (APPLIED, SCREENING, INTERVIEW, SELECTED, REJECTED)',
  })
  @IsEnum(ApplicationStatus, {
    message: 'Status must be APPLIED, SCREENING, INTERVIEW, SELECTED, or REJECTED',
  })
  @IsNotEmpty({ message: 'Target pipeline status is required' })
  status: ApplicationStatus;

  @ApiProperty({
    example: 'Passed technical screening call. Scheduling technical interview.',
    description: 'Optional note explaining the status change',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
