import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'I am highly interested in this role and have 3+ years of NestJS experience.',
    description: 'Optional cover letter or note from applicant',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}
