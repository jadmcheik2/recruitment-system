import { ApiProperty } from '@nestjs/swagger';
import { InterviewStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateInterviewDto {
  @ApiProperty({
    enum: InterviewStatus,
    example: InterviewStatus.COMPLETED,
    description: 'Updated interview status (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW)',
    required: false,
  })
  @IsOptional()
  @IsEnum(InterviewStatus, {
    message: 'Status must be SCHEDULED, COMPLETED, CANCELLED, or NO_SHOW',
  })
  status?: InterviewStatus;

  @ApiProperty({
    example: 'Candidate demonstrated strong architectural skills. Recommended for hiring.',
    description: 'Interviewer notes and evaluation feedback',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
