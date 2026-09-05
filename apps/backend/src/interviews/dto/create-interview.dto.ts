import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInterviewDto {
  @ApiProperty({
    example: '83f71358-1234-4567-89ab-cdef01234567',
    description: 'Application ID for which this interview is scheduled',
  })
  @IsUUID('4', { message: 'applicationId must be a valid UUID' })
  @IsNotEmpty({ message: 'applicationId is required' })
  applicationId: string;

  @ApiProperty({
    example: '94e82469-5678-90ab-cdef-1234567890ab',
    description: 'User ID of the Interviewer assigned to conduct the interview',
  })
  @IsUUID('4', { message: 'interviewerId must be a valid UUID' })
  @IsNotEmpty({ message: 'interviewerId is required' })
  interviewerId: string;

  @ApiProperty({
    example: '2026-09-05T14:00:00.000Z',
    description: 'Date and time when the interview is scheduled to take place',
  })
  @IsDateString({}, { message: 'scheduledAt must be a valid ISO date-time string' })
  @IsNotEmpty({ message: 'scheduledAt is required' })
  scheduledAt: string;

  @ApiProperty({
    example: 'Technical System Design Interview focusing on NestJS & PostgreSQL.',
    description: 'Optional interview agenda or preparation notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
