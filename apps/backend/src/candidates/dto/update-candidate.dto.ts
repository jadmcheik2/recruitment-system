import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateCandidateDto {
  @ApiProperty({
    example: 'Jane Candidate',
    description: 'Full name of candidate',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: ['Next.js', 'NestJS', 'PostgreSQL', 'Tailwind CSS'],
    description: 'List of candidate skills',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Skills must be an array of strings' })
  @IsString({ each: true, message: 'Each skill must be a text string' })
  skills?: string[];
}
