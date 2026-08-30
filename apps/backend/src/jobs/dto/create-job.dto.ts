import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({
    example: 'Full Stack Developer',
    description: 'Title of the job opening',
  })
  @IsString()
  @IsNotEmpty({ message: 'Job title is required' })
  title: string;

  @ApiProperty({
    example: 'We are looking for a full stack developer with Next.js and NestJS experience.',
    description: 'Detailed description of job requirements and responsibilities',
  })
  @IsString()
  @IsNotEmpty({ message: 'Job description is required' })
  description: string;

  @ApiProperty({
    example: 'Remote / Beirut',
    description: 'Location of the job',
  })
  @IsString()
  @IsNotEmpty({ message: 'Job location is required' })
  location: string;

  @ApiProperty({
    example: 'Full-time',
    description: 'Employment type (e.g. Full-time, Part-time, Contract, Remote)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Job type is required' })
  type: string;
}
