import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRecruiterDto {
  @ApiProperty({
    example: '83f71358-1234-4567-89ab-cdef01234567',
    description: 'User ID of Recruiter assigned to manage this application',
  })
  @IsUUID('4', { message: 'recruiterId must be a valid UUID' })
  @IsNotEmpty({ message: 'recruiterId is required' })
  recruiterId: string;
}
