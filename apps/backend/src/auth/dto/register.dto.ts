import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Applicant email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the candidate',
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  name: string;
}
